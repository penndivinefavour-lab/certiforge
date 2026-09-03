// Generation job management (self-contained)
import { prisma } from "./db";
import { generateVerificationToken } from "./auth";
import type { GenerationJob, GenerationJobStatus, JobItemStatus } from "../../packages/types/src/index.ts";

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
  const job = await prisma.generationJob.create({
    data: {
      projectId,
      status: "QUEUED",
      total: totalRecipients,
    },
  });

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

export async function startGenerationJob(jobId: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
    },
  });
}

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
        attempts: 1,
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

    await tx.generationJob.update({
      where: { id: (await tx.generationJobItem.findUnique({ where: { id: jobItemId } }))!.generationJobId },
      data: {
        completed: { increment: 1 },
      },
    });
  });
}

export async function completeGenerationJob(jobId: string, outputUrl: string): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      outputUrl,
    },
  });
}

export async function getGenerationJob(jobId: string): Promise<GenerationJob | null> {
  return prisma.generationJob.findUnique({ where: { id: jobId } });
}

export async function getJobProgress(jobId: string) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        include: { certificate: true }
      }
    }
  });
  
  if (!job) return null;
  
  const completed = job.items.filter(i => i.status === "COMPLETED").length;
  const failed = job.items.filter(i => i.status === "FAILED").length;
  
  return {
    total: job.total,
    completed,
    failed,
    progress: job.total > 0 ? Math.round((completed / job.total) * 100) : 0,
  };
}
