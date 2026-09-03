// Generation job management
import { prisma } from "./client";
import { claimCertificateNumber } from "./certificates";
import { createRecipientImport } from "./recipients";
import type { GenerationJob, GenerationJobStatus, JobItemStatus } from "../../packages/types/src/index.ts";

// Queue a new generation job
export async function createGenerationJob(
  projectId: string,
  userId: string,
  totalRecipients: number,
  certificateRecipients: Array<{
    recipientId: string;
    name: string;
    email?: string;
    metadata: Record<string, unknown>;
  }>
): Promise<{ job: GenerationJob; certificateIds: string[] }> {
  // Create the job
  const job = await prisma.generationJob.create({
    data: {
      projectId,
      status: "QUEUED",
      total: totalRecipients,
    },
  });

  // Create generation items for each recipient
  const certificateIds: string[] = [];

  for (const recipient of certificateRecipients) {
    const cert = await prisma.certificate.create({
      data: {
        projectId,
        recipientId: recipient.recipientId,
        status: "DRAFT",
        verificationToken: generateVerificationToken(),
        metadata: JSON.stringify(recipient.metadata),
      },
    });

    certificateIds.push(cert.id);

    await prisma.generationJobItem.create({
      data: {
        generationJobId: job.id,
        certificateId: cert.id,
        status: "PENDING",
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: (await prisma.project.findUnique({ where: { id: projectId } }))?.organizationId || "",
      actorId: userId,
      action: "GENERATION_JOB_CREATED",
      resourceType: "generation_job",
      resourceId: job.id,
      details: JSON.stringify({
        totalRecipients,
        certificateIds: certificateIds.length,
      }),
    },
  });

  return { job, certificateIds };
}

// Start processing the job
export async function startGenerationJob(jobId: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });
}

// Mark an item as completed
export async function completeJobItem(
  jobItemId: string,
  certificateId: string,
  pdfUrl: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.generationJobItem.update({
      where: { id: jobItemId },
      data: {
        status: "COMPLETED",
        attempts: 1, // Will be incremented separately if we add retry logic
      },
    });

    await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: "GENERATED",
        pdfUrl,
        issuedAt: new Date(),
      },
    });

    // Increment completed count
    await tx.generationJob.update({
      where: { id: (await tx.generationJobItem.findUnique({ where: { id: jobItemId } }))!.generationJobId },
      data: {
        completed: { increment: 1 },
      },
    });
  });
}

// Mark an item as failed
export async function failJobItem(
  jobItemId: string,
  error: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.generationJobItem.update({
      where: { id: jobItemId },
      data: {
        status: "FAILED",
        error,
        attempts: { increment: 1 },
      },
    });

    // Increment failed count
    await tx.generationJob.update({
      where: { id: (await tx.generationJobItem.findUnique({ where: { id: jobItemId } }))!.generationJobId },
      data: {
        failed: { increment: 1 },
      },
    });
  });
}

// Complete a job (all items done)
export async function completeGenerationJob(
  jobId: string,
  outputUrl: string
): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      outputUrl,
    },
  });

  // Create certificate events for all issued certificates
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { items: { include: { certificate: true } } },
  });

  if (job) {
    for (const item of job.items) {
      if (item.status === "COMPLETED" && item.certificate.status === "ISSUED") {
        await prisma.certificateEvent.create({
          data: {
            certificateId: item.certificateId,
            eventType: "ISSUED",
            metadata: JSON.stringify({}),
          },
        });
      }
    }
  }
}

// Mark job as partial failure
export async function partialFailureJob(jobId: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "PARTIAL_FAILURE",
      completedAt: new Date(),
    },
  });
}

// Mark job as failed
export async function failGenerationJob(jobId: string, error: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      error,
      completedAt: new Date(),
    },
  });
}

// Get job status
export async function getGenerationJob(jobId: string): Promise<GenerationJob | null> {
  return prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        include: { certificate: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// Get job items for progress tracking
export async function getJobProgress(jobId: string) {
  const [total, completed, failed] = await Promise.all([
    prisma.generationJobItem.count({ where: { generationJobId: jobId } }),
    prisma.generationJobItem.count({ where: { generationJobId: jobId, status: "COMPLETED" } }),
    prisma.generationJobItem.count({ where: { generationJobId: jobId, status: "FAILED" } }),
  ]);

  return { total, completed, failed, percent: total > 0 ? (completed / total) * 100 : 0 };
}

// Retry failed items
export async function retryFailedItems(
  jobId: string,
  userId: string
): Promise<number> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { items: { where: { status: "FAILED" }, include: { certificate: true } } },
  });

  if (!job) throw new Error("Job not found");

  // Only owner/admin can retry
  // validatePermission would go here in production

  const retryPromises = job.items.map(async (item) => {
    await prisma.$transaction(async (tx) => {
      // Reset item status
      await tx.generationJobItem.update({
        where: { id: item.id },
        data: {
          status: "PENDING",
          error: null,
          attempts: 0,
        },
      });
    });
  });

  await Promise.all(retryPromises);

  // Reset job status to processing
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      completed: 0,
      failed: 0,
      startedAt: new Date(),
      completedAt: null,
      outputUrl: null,
      error: null,
    },
  });

  return job.items.length;
}

// Cancel a job
export async function cancelGenerationJob(jobId: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });

  // Mark all pending items as skipped
  await prisma.generationJobItem.updateMany({
    where: { generationJobId: jobId, status: "PENDING" },
    data: { status: "SKIPPED" },
  });
}

// ============================================================================
// CERTIFICATE CREATION (Direct - not through bulk job)
// ============================================================================

export async function createCertificate(
  projectId: string,
  recipientId: string,
  templateVersionId: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<{ certificate: any; certificateNumber: string }> {
  // Claim certificate number
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");
  const year = new Date().getFullYear();
  const { certificateNumber } = await claimCertificateNumber(projectId, year);

  // Generate verification token
  const verificationToken = generateVerificationToken();

  // Create certificate
  const certificate = await prisma.certificate.create({
    data: {
      projectId,
      recipientId,
      templateVersionId,
      certificateNumber,
      verificationToken,
      status: "DRAFT",
      metadata: metadata ? JSON.stringify(metadata) : "{}",
    },
  });

  // Create event
  await prisma.certificateEvent.create({
    data: {
      certificateId: certificate.id,
      eventType: "CREATED",
      actorId: userId,
      metadata: JSON.stringify({}),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: project.organizationId,
      actorId: userId,
      action: "CERTIFICATE_CREATED",
      resourceType: "certificate",
      resourceId: certificate.id,
      details: JSON.stringify({
        certificateNumber,
        recipientId,
      }),
    },
  });

  return { certificate, certificateNumber };
}

// Issue a certificate (mark as ISSUED)
export async function issueCertificate(
  certificateId: string,
  userId: string
): Promise<void> {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!cert) throw new Error("Certificate not found");
  if (cert.status !== "DRAFT" && cert.status !== "GENERATED") {
    throw new Error("Certificate cannot be issued in current state");
  }

  await prisma.$transaction(async (tx) => {
    await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: "ISSUED",
        issuedAt: new Date(),
      },
    });

    await tx.certificateEvent.create({
      data: {
        certificateId,
        eventType: "ISSUED",
        actorId: userId,
        metadata: JSON.stringify({}),
      },
    });

    // Audit log
    const project = await tx.project.findUnique({ where: { id: cert.projectId } });
    if (project) {
      await tx.auditLog.create({
        data: {
          organizationId: project.organizationId,
          actorId: userId,
          action: "CERTIFICATE_ISSUED",
          resourceType: "certificate",
          resourceId: certificateId,
          details: JSON.stringify({ certificateNumber: cert.certificateNumber }),
        },
      });
    }
  });
}

// ============================================================================
// HELPER
// ============================================================================

function generateVerificationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
}
