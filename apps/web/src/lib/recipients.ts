// Recipients operations (self-contained)
import { prisma } from "./db";
import type { Recipient, RecipientImport, RecipientImportRow, RecipientMapping } from "../../packages/types/src/index.ts";
import { z } from "zod";

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 100000;

export type ParsedSpreadsheet = {
  fileName: string;
  fileType: "CSV" | "XLSX";
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
};

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

export function detectColumns(headers: string[]): DetectedColumns {
  const normalized = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, ""));
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

    if (!result.recipientName && /^(name|full_name|recipient|student|participant|attendee)$/i.test(headers[i])) {
      result.recipientName = original;
    } else if (!result.email && /^(email|email_address|mail)$/i.test(headers[i])) {
      result.email = original;
    } else if (!result.courseName && /^(course|course_name|program|training)$/i.test(headers[i])) {
      result.courseName = original;
    } else if (!result.issueDate && /^(date|issue_date|completion_date)$/i.test(headers[i])) {
      result.issueDate = original;
    } else if (!result.instructor && /^(instructor|trainer|teacher)$/i.test(headers[i])) {
      result.instructor = original;
    } else if (!result.grade && /^(grade|score|result)$/i.test(headers[i])) {
      result.grade = original;
    } else if (!result.duration && /^(duration|hours|credits)$/i.test(headers[i])) {
      result.duration = original;
    } else if (!result.organization && /^(organization|company|org)$/i.test(headers[i])) {
      result.organization = original;
    }
  }

  const custom: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const norm = normalized[i];
    if (!result.recipientName?.toLowerCase().includes(norm) &&
        !result.email?.toLowerCase().includes(norm) &&
        !result.courseName?.toLowerCase().includes(norm) &&
        !result.issueDate?.toLowerCase().includes(norm) &&
        !result.instructor?.toLowerCase().includes(norm) &&
        !result.grade?.toLowerCase().includes(norm) &&
        !result.duration?.toLowerCase().includes(norm) &&
        !result.organization?.toLowerCase().includes(norm)) {
      custom[headers[i]] = headers[i];
    }
  }

  if (Object.keys(custom).length > 0) {
    result.customColumns = custom;
  }

  return result;
}

export function parseCSV(content: string, fileName: string): ParsedSpreadsheet {
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

  if (current || row.length > 0) {
    row.push(current.trim());
    lines.push(row);
  }

  if (lines.length === 0) throw new Error("Empty file");
  const headers = lines[0];
  if (headers.length === 0) throw new Error("No headers found");

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

    const nameField = detectColumns(headers).recipientName;
    if (nameField && (!data[nameField] || data[nameField].trim() === "")) {
      errors.push(`Missing recipient name in row ${i + 1}`);
    }

    parsedRows.push({ rowNumber: i + 1, data, errors });
    if (errors.length === 0) validCount++;
    else invalidCount++;
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

export async function createRecipientImport(
  projectId: string,
  userId: string,
  input: {
    fileName: string;
    fileType: "CSV" | "XLSX";
    parsedData: { headers: string[]; rows: ParsedRow[] };
    mapping: { recipientName?: string; email?: string; courseName?: string; issueDate?: string; instructor?: string; grade?: string; duration?: string; organization?: string; customFields?: Record<string, string> };
  }
): Promise<RecipientImport> {
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

  return importObj;
}

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

export function parseImportFile(buffer: Buffer, fileName: string): ParsedSpreadsheet {
  const content = buffer.toString("utf-8");
  if (fileName.toLowerCase().endsWith(".csv")) {
    return parseCSV(content, fileName);
  }
  throw new Error("Only CSV files are supported in this mode");
}

export function validateImportRows(parsed: ParsedSpreadsheet, mapping: Record<string, string>) {
  const validRows: typeof parsed.rows = [];
  const invalidRows: typeof parsed.rows = [];
  const warnings: string[] = [];

  for (const row of parsed.rows) {
    const errors = [...row.errors];
    const mapped: Record<string, string> = {};
    for (const [source, target] of Object.entries(mapping)) {
      mapped[target] = row.data[source] ?? "";
    }
    if (!mapped.recipient_name && !mapped.recipientName) {
      errors.push("Missing recipient name after mapping");
    }
    if (errors.length > 0) {
      invalidRows.push({ ...row, data: mapped, errors });
    } else {
      validRows.push({ ...row, data: mapped, errors: [] });
    }
  }

  if (invalidRows.length > 0) {
    warnings.push(`${invalidRows.length} row(s) failed validation`);
  }
  return { validRows, invalidRows, warnings, total: parsed.totalRows };
}
