import { createRecipientImport, parseImportFile, validateImportRows, detectColumns } from "@/lib/recipients";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, getUserFromSession } from "@/lib/auth";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";

const ImportSchema = z.object({
  projectId: z.string(),
  fileName: z.string().min(1),
  fileType: z.enum(["CSV", "XLSX"]),
  buffer: z.instanceof(Buffer),
  mapping: z.object({
    recipientName: z.string().optional(),
    email: z.string().optional(),
    courseName: z.string().optional(),
    issueDate: z.string().optional(),
    instructor: z.string().optional(),
    grade: z.string().optional(),
    duration: z.string().optional(),
    organization: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromSession(session);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const mappingStr = formData.get("mapping") as string;

    if (!file || !projectId) {
      return NextResponse.json({ error: "File and project ID are required" }, { status: 400 });
    }

    // Verify project access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await requirePermission(user.id, project.organizationId, "EDITOR");

    // Parse file
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseImportFile(buffer, file.name);

    if (parsed.totalRows === 0) {
      return NextResponse.json({ error: "No data rows found in file" }, { status: 400 });
    }

    // Parse mapping
    let mapping = { recipientName: null, email: null, courseName: null, issueDate: null, instructor: null, grade: null, duration: null, organization: null };
    if (mappingStr) {
      try {
        const parsedMapping = JSON.parse(mappingStr);
        mapping = {
          recipientName: parsedMapping.recipientName || null,
          email: parsedMapping.email || null,
          courseName: parsedMapping.courseName || null,
          issueDate: parsedMapping.issueDate || null,
          instructor: parsedMapping.instructor || null,
          grade: parsedMapping.grade || null,
          duration: parsedMapping.duration || null,
          organization: parsedMapping.organization || null,
        };
      } catch {
        // Use auto-detected mapping
      }
    } else {
      // Auto-detect mapping from headers
      if (parsed.headers.length > 0) {
        const detected = detectColumns(parsed.headers);
        mapping.recipientName = detected.recipientName;
        mapping.email = detected.email;
        mapping.courseName = detected.courseName;
        mapping.issueDate = detected.issueDate;
        mapping.instructor = detected.instructor;
        mapping.grade = detected.grade;
        mapping.duration = detected.duration;
        mapping.organization = detected.organization;
      }
    }

    // Use the database layer to create the import
    const importResult = await createRecipientImport(projectId, user.id, {
      projectId,
      fileName: file.name,
      fileType: parsed.fileType,
      parsedData: {
        headers: parsed.headers,
        rows: parsed.rows.map((r) => ({
          rowNumber: r.rowNumber,
          data: r.data,
          errors: r.errors,
        })),
      },
      mapping,
    });

    // Validate and return counts
    const validation = validateImportRows(
      parsed.rows.map((r) => ({
        rowNumber: r.rowNumber,
        data: r.data,
        errors: r.errors,
      })),
      null,
      projectId
    );

    return NextResponse.json({
      import: {
        id: importResult.id,
        fileName: importResult.fileName,
        fileType: importResult.fileType,
        totalRows: importResult.totalRows,
        validRows: importResult.validRows,
        invalidRows: importResult.invalidRows,
      },
      validation: {
        validRecords: validation.validRecords,
        totalRecords: validation.totalRecords,
        errors: validation.errors,
        warnings: validation.warnings,
        canGenerate: validation.canGenerate,
      },
      headers: parsed.headers,
      detectedColumns: {
        recipientName: mapping.recipientName,
        email: mapping.email,
        courseName: mapping.courseName,
        issueDate: mapping.issueDate,
        instructor: mapping.instructor,
        grade: mapping.grade,
        duration: mapping.duration,
        organization: mapping.organization,
      },
    });
  } catch (error: any) {
    console.error("Import error:", error);
    if (error.message?.includes("maximum size")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to import file" }, { status: 500 });
  }
}
