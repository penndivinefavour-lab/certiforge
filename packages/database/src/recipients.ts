import { prisma } from "./client";
import type {
  Recipient,
  RecipientImport,
  RecipientImportRow,
  RecipientMapping,
} from "../../packages/types/src/index.ts";
import { z } from "zod";

// ============================================================================
// CSV/XLSX PARSING
// ============================================================================

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 100000;
const SUPPORTED_TYPES = [".csv", ".xlsx", ".xls"];

const ImportFileSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(["CSV", "XLSX"]),
  content: z.unknown(), // Buffer for XLSX, string for CSV
});

export type ParsedSpreadsheet = {
  fileName: string;
  fileType: "CSV" | "XLSX";
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
};

// Column mapping schemas
export const ColumnDetectionSchema = z.object({
  recipientName: z.string().optional(),
  email: z.string().optional(),
  courseName: z.string().optional(),
  issueDate: z.string().optional(),
  instructor: z.string().optional(),
  grade: z.string().optional(),
  duration: z.string().optional(),
  organization: z.string().optional(),
  customColumns: z.record(z.string(), z.string()).optional(),
});

export type DetectedColumns = z.infer<typeof ColumnDetectionSchema>;

// Normalize column names for matching
function normalizeColumn(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Detect which columns map to which standard fields
export function detectColumns(headers: string[]): DetectedColumns {
  const normalized = headers.map(normalizeColumn);
  const result: DetectedColumns = {
    recipientName: undefined,
    email: undefined,
    courseName: undefined,
    issueDate: undefined,
    instructor: undefined,
    grade: undefined,
    duration: undefined,
    organization: undefined,
    customColumns: undefined,
  };

  for (let i = 0; i < headers.length; i++) {
    const norm = normalized[i];
    const original = headers[i];

    if (!result.recipientName && /^(name|full_name|recipient|student|participant|attendee|fullname)$/i.test(headers[i])) {
      result.recipientName = original;
    } else if (!result.email && /^(email|email_address|mail|ekey)$/i.test(headers[i])) {
      result.email = original;
    } else if (!result.courseName && /^(course|course_name|program|training|workshop|title|class_name)$/i.test(headers[i])) {
      result.courseName = original;
    } else if (!result.issueDate && /^(date|issue_date|completion_date|completion_date|date_completed|issued_on|completion|completed_on)$/i.test(headers[i])) {
      result.issueDate = original;
    } else if (!result.instructor && /^(instructor|trainer|teacher|facilitator|instructor_name|trainer_name)$/i.test(headers[i])) {
      result.instructor = original;
    } else if (!result.grade && /^(grade|score|result|mark|grade_result|assessment)$/i.test(headers[i])) {
      result.grade = original;
    } else if (!result.duration && /^(duration|hours|credits|hours_completed|credit_hours)$/i.test(headers[i])) {
      result.duration = original;
    } else if (!result.organization && /^(organization|company|org|issuer|organization_name)$/i.test(headers[i])) {
      result.organization = original;
    }
  }

  // Capture custom columns
  const custom: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const norm = normalized[i];
    if (
      !result.recipientName?.toLowerCase().includes(norm) &&
      !result.email?.toLowerCase().includes(norm) &&
      !result.courseName?.toLowerCase().includes(norm) &&
      !result.issueDate?.toLowerCase().includes(norm) &&
      !result.instructor?.toLowerCase().includes(norm) &&
      !result.grade?.toLowerCase().includes(norm) &&
      !result.duration?.toLowerCase().includes(norm) &&
      !result.organization?.toLowerCase().includes(norm)
    ) {
      custom[headers[i]] = headers[i];
    }
  }

  if (Object.keys(custom).length > 0) {
    result.customColumns = custom;
  }

  return result;
}

// Parse CSV content
export function parseCSV(content: string, fileName: string): ParsedSpreadsheet {
  // Simple CSV parser (handles quotes, escaped quotes)
  const lines: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];
  let col = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
        col++;
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        if (char === "\r") i++;
        row.push(current.trim());
        lines.push(row);
        row = [];
        col = 0;
        current = "";
      } else if (char === "\r") {
        row.push(current.trim());
        lines.push(row);
        row = [];
        col = 0;
        current = "";
      } else {
        current += char;
      }
    }
  }

  // Last row
  if (current || row.length > 0) {
    row.push(current.trim());
    lines.push(row);
  }

  if (lines.length === 0) {
    throw new Error("Empty file");
  }

  const headers = lines[0];
  if (headers.length === 0) {
    throw new Error("No headers found");
  }

  const parsedRows: ParsedRow[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0 || (line.length === 1 && line[0] === "")) continue;

    const data: Record<string, string> = {};
    const errors: string[] = [];

    for (let j = 0; j < headers.length; j++) {
      data[headers[j]] = j < line.length ? line[j] : "";
    }

    // Validate: recipient name is required
    const nameField = detectColumns(headers).recipientName;
    if (nameField && (!data[nameField] || data[nameField].trim() === "")) {
      errors.push(`Missing recipient name in row ${i + 1}`);
    }

    parsedRows.push({
      rowNumber: i + 1,
      data,
      errors,
    });

    if (errors.length === 0) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  return {
    fileName,
    fileType: "CSV",
    headers,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
  };
}

// Parse XLSX content (using xlsx library)
export async function parseXLSX(
  buffer: Buffer,
  fileName: string
): Promise<ParsedSpreadsheet> {
  const XLSX = require("xlsx") as typeof import("xlsx");

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (!jsonData || jsonData.length === 0) {
    throw new Error("Empty spreadsheet");
  }

  const headers = jsonData[0] as string[];
  if (!headers || headers.length === 0) {
    throw new Error("No headers found");
  }

  const parsedRows: ParsedRow[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as (string | number)[];
    if (!row || row.length === 0) continue;

    const data: Record<string, string> = {};
    const errors: string[] = [];

    for (let j = 0; j < headers.length; j++) {
      data[headers[j]] = row[j]?.toString() ?? "";
    }

    const nameField = detectColumns(headers).recipientName;
    if (nameField && (!data[nameField] || data[nameField].trim() === "")) {
      errors.push(`Missing recipient name in row ${i + 1}`);
    }

    parsedRows.push({
      rowNumber: i + 1,
      data,
      errors,
    });

    if (errors.length === 0) {
      validCount++;
    } else {
      invalidCount++;
    }
  }

  return {
    fileName,
    fileType: "XLSX",
    headers,
    rows: parsedRows,
    totalRows: parsedRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
  };
}

// Main import function - parses file and returns structured data
export async function parseImportFile(
  buffer: Buffer,
  fileName: string
): Promise<ParsedSpreadsheet> {
  const ext = fileName.toLowerCase().endsWith(".csv") ? ".csv" : ".xlsx";

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  if (ext === ".csv") {
    const content = buffer.toString("utf-8");
    return parseCSV(content, fileName);
  } else {
    return parseXLSX(buffer, fileName);
  }
}

// ============================================================================
// RECIPIENT IMPORT (Database)
// ============================================================================

const CreateImportSchema = z.object({
  projectId: z.string(),
  fileName: z.string().min(1),
  fileType: z.enum(["CSV", "XLSX"]),
  parsedData: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.object({
      rowNumber: z.number(),
      data: z.record(z.string(), z.string()),
      errors: z.array(z.string()),
    })),
  }),
  mapping: z.object({
    recipientName: z.string().optional(),
    email: z.string().optional(),
    courseName: z.string().optional(),
    issueDate: z.string().optional(),
    instructor: z.string().optional(),
    grade: z.string().optional(),
    duration: z.string().optional(),
    organization: z.string().optional(),
    customFields: z.record(z.string(), z.string()).optional(),
  }),
});

export type CreateImportInput = z.infer<typeof CreateImportSchema>;

export async function createRecipientImport(
  projectId: string,
  userId: string,
  input: CreateImportInput
): Promise<RecipientImport> {
  // Validate project access
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const importObj = await prisma.recipientImport.create({
    data: {
      projectId,
      fileName: input.fileName,
      fileType: input.fileType,
      totalRows: input.parsedData.rows.length,
      validRows: input.parsedData.rows.filter(r => r.errors.length === 0).length,
      invalidRows: input.parsedData.rows.filter(r => r.errors.length > 0).length,
      status: "COMPLETED",
    },
  });

  // Create import rows
  for (const row of input.parsedData.rows) {
    await prisma.recipientImportRow.create({
      data: {
        importId: importObj.id,
        rowNumber: row.rowNumber,
        rawData: JSON.stringify(row.data),
        status: row.errors.length === 0 ? "VALID" : "INVALID",
        errors: row.errors.length > 0 ? JSON.stringify(row.errors) : null,
      },
    });
  }

  // Create mapping
  const mappingData: Record<string, string | null> = {
    recipientName: input.mapping.recipientName || null,
    email: input.mapping.email || null,
    courseName: input.mapping.courseName || null,
    issueDate: input.mapping.issueDate || null,
    instructor: input.mapping.instructor || null,
    grade: input.mapping.grade || null,
    duration: input.mapping.duration || null,
    organization: input.mapping.organization || null,
  };

  if (input.mapping.customFields) {
    mappingData.customFields = JSON.stringify(input.mapping.customFields);
  }

  await prisma.recipientMapping.create({
    data: {
      importId: importObj.id,
      ...mappingData,
    } as any,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: project.organizationId,
      actorId: userId,
      action: "RECIPIENT_IMPORT",
      resourceType: "recipient_import",
      resourceId: importObj.id,
      details: JSON.stringify({
        fileName: input.fileName,
        fileType: input.fileType,
        totalRows: importObj.totalRows,
        validRows: importObj.validRows,
        invalidRows: importObj.invalidRows,
      }),
    },
  });

  return importObj;
}

export async function getRecipientImport(id: string): Promise<RecipientImport | null> {
  return prisma.recipientImport.findUnique({
    where: { id },
    include: {
      rows: { orderBy: { rowNumber: "asc" } },
      mapping: true,
    },
  });
}

export async function listRecipientImports(projectId: string) {
  return prisma.recipientImport.findMany({
    where: { projectId },
    include: { mapping: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecipientImportRows(importId: string) {
  return prisma.recipientImportRow.findMany({
    where: { importId },
    orderBy: { rowNumber: "asc" },
  });
}

// ============================================================================
// RECIPIENTS (Database)
// ============================================================================

export async function createRecipient(
  organizationId: string,
  data: { name: string; email?: string; externalId?: string; metadata?: Record<string, unknown> }
): Promise<Recipient> {
  return prisma.recipient.create({
    data: {
      organizationId,
      name: data.name,
      email: data.email || null,
      externalId: data.externalId || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
    },
  });
}

export async function getRecipient(id: string): Promise<Recipient | null> {
  return prisma.recipient.findUnique({
    where: { id },
    include: { project: { select: { id: true, name: true } } },
  });
}

export async function listRecipients(
  orgId: string,
  projectId?: string,
  page = 1,
  pageSize = 20,
  search?: string
) {
  const where: any = { organizationId: orgId };
  if (projectId) where.projectId = projectId;
  if (search) {
    where.name = { contains: search };
  }

  const [recipients, total] = await Promise.all([
    prisma.recipient.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recipient.count({ where }),
  ]);

  return {
    data: recipients,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export async function updateRecipient(
  recipientId: string,
  data: { name?: string; email?: string | null; metadata?: Record<string, unknown> }
): Promise<Recipient> {
  return prisma.recipient.update({
    where: { id: recipientId },
    data: {
      name: data.name,
      email: data.email,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  });
}

export async function deleteRecipient(recipientId: string) {
  await prisma.recipient.delete({ where: { id: recipientId } });
}

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

export interface ValidationError {
  type: "ERROR" | "WARNING";
  field: string;
  message: string;
  rowNumber: number;
}

export interface ValidationResult {
  validRecords: number;
  totalRecords: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  canGenerate: boolean;
}

export function validateImportRows(
  rows: Array<{ rowNumber: number; data: Record<string, string>; errors: string[] }>,
  mapping: RecipientMapping | null,
  projectId: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const validRecords: number[] = [];

  // Build column-to-field mapping
  const fieldMap: Record<string, string> = {};

  if (mapping) {
    if (mapping.recipientName) fieldMap[mapping.recipientName] = "recipient_name";
    if (mapping.email) fieldMap[mapping.email] = "email";
    if (mapping.courseName) fieldMap[mapping.courseName] = "course_name";
    if (mapping.issueDate) fieldMap[mapping.issueDate] = "issue_date";
    if (mapping.instructor) fieldMap[mapping.instructor] = "instructor";
    if (mapping.grade) fieldMap[mapping.grade] = "grade";
    if (mapping.duration) fieldMap[mapping.duration] = "duration";
    if (mapping.organization) fieldMap[mapping.organization] = "organization";
  }

  // Add custom fields
  if (mapping?.customFields) {
    const custom = JSON.parse(mapping.customFields);
    for (const [fieldName, columnName] of Object.entries(custom)) {
      fieldMap[columnName as string] = fieldName;
    }
  }

  const existingNames = new Set<string>();
  const seenNames: Record<string, number> = {}; // name -> first row number

  for (const row of rows) {
    const rowErrors: ValidationError[] = [];
    const rowWarnings: ValidationError[] = [];
    let hasRequiredError = false;

    // Check required: recipient name
    const nameCol = mapping?.recipientName;
    if (nameCol) {
      const name = (row.data[nameCol] || "").trim();
      if (!name) {
        rowErrors.push({
          type: "ERROR",
          field: "recipient_name",
          message: "Recipient name is required",
          rowNumber: row.rowNumber,
        });
        hasRequiredError = true;
      } else {
        // Check for duplicates
        const normalized = name.toLowerCase();
        if (seenNames[normalized] !== undefined) {
          rowWarnings.push({
            type: "WARNING",
            field: "recipient_name",
            message: `Duplicate recipient name: "${name}" (first seen at row ${seenNames[normalized]})`,
            rowNumber: row.rowNumber,
          });
        } else {
          seenNames[normalized] = row.rowNumber;
        }

        existingNames.add(name);
      }
    }

    // Check email format if present
    const emailCol = mapping?.email;
    if (emailCol && row.data[emailCol]) {
      const email = row.data[emailCol].trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowWarnings.push({
          type: "WARNING",
          field: "email",
          message: `Invalid email format: "${email}"`,
          rowNumber: row.rowNumber,
        });
      }
    }

    // Check date format if present
    const dateCol = mapping?.issueDate;
    if (dateCol && row.data[dateCol]) {
      const dateStr = row.data[dateCol].trim();
      // Accept various date formats
      const dateValid = !isNaN(Date.parse(dateStr)) ||
        /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr) ||
        /^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr);
      if (!dateValid) {
        rowWarnings.push({
          type: "WARNING",
          field: "issue_date",
          message: `Unrecognized date format: "${dateStr}"`,
          rowNumber: row.rowNumber,
        });
      }
    }

    // Existing row errors from parsing
    for (const err of row.errors) {
      rowErrors.push({
        type: "ERROR",
        field: "import",
        message: err,
        rowNumber: row.rowNumber,
      });
      hasRequiredError = true;
    }

    if (hasRequiredError) {
      errors.push(...rowErrors);
    } else {
      validRecords.push(row.rowNumber);
    }

    warnings.push(...rowWarnings);
  }

  return {
    validRecords: validRecords.length,
    totalRecords: rows.length,
    errors,
    warnings,
    canGenerate: errors.length === 0,
  };
}

// Run validation and return results
export async function validateImport(
  importId: string,
  userId: string
): Promise<ValidationResult> {
  const importObj = await prisma.recipientImport.findUnique({
    where: { id: importId },
    include: { mapping: true },
  });

  if (!importObj) throw new Error("Import not found");

  const rows = await prisma.recipientImportRow.findMany({
    where: { importId },
    orderBy: { rowNumber: "asc" },
  });

  const parsedRows = rows.map(r => ({
    rowNumber: r.rowNumber,
    data: JSON.parse(r.rawData),
    errors: r.errors ? JSON.parse(r.errors) : [],
  }));

  return validateImportRows(parsedRows, importObj.mapping, importObj.projectId);
}
