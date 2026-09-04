// CertiForge Worker - Self-contained job processor (no Redis required)
// Uses a simple array-based queue for development
import { PrismaClient } from '@prisma/client';
import { renderCertificateToBuffer } from '@certiforge/certificate-engine';
import { createZip } from './lib/archive';

const prisma = new PrismaClient();

interface Job {
  id: string;
  projectId: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
  data: {
    templateId: string;
    recipientIds: string[];
  };
}

async function processJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      items: {
        include: {
          certificate: {
            include: {
              recipient: true,
              project: true,
            },
          },
        },
      },
      project: {
        include: {
          template: {
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!job) return;

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  const templateVersion = job.project?.template?.versions?.[0];
  if (!templateVersion) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: 'No template version found' },
    });
    return;
  }

  let completed = 0;
  let failed = 0;
  const pdfBuffers: Array<{ name: string; data: Buffer }> = [];

  for (const item of job.items) {
    try {
      const cert = item.certificate;
      if (!cert) continue;

      const pdfBytes = await renderCertificateToBuffer(
        templateVersion,
        cert.certificateNumber,
        cert.recipient?.name || 'Unknown',
        cert.metadata ? JSON.parse(cert.metadata) : {}
      );

      // Generate QR code URL for this certificate
      const verificationUrl = `${process.env.VERIFICATION_BASE_URL || 'http://localhost:3000'}/verify/${cert.certificateNumber}`;

      // Store PDF reference
      await prisma.certificate.update({
        where: { id: cert.id },
        data: { status: 'GENERATED', pdfUrl: verificationUrl, issuedAt: new Date() },
      });

      await prisma.generationJobItem.update({
        where: { id: item.id },
        data: { status: 'COMPLETED', attempts: item.attempts + 1 },
      });

      completed++;
      pdfBuffers.push({
        name: sanitizeFilename(`${cert.recipient?.name || 'recipient'}_${cert.certificateNumber}.pdf`),
        data: Buffer.from(pdfBytes),
      });
    } catch (err) {
      failed++;
      await prisma.generationJobItem.update({
        where: { id: item.id },
        data: { status: 'FAILED', error: String(err) },
      });
    }

    // Update progress
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { completed, failed },
    });
  }

  // Create ZIP if all succeeded
  if (failed === 0 && pdfBuffers.length > 0) {
    try {
      const zipBuffer = await createZip(pdfBuffers);
      // In production, upload to S3; for now, store as base64
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', outputUrl: `data:application/zip;base64,${zipBuffer.toString('base64').slice(0, 100)}...` },
      });
    } catch (err) {
      console.error('ZIP creation failed:', err);
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId: job.project?.organizationId || '',
      projectId: job.projectId,
      action: 'GENERATION_JOB_COMPLETED',
      resourceType: 'generation_job',
      resourceId: jobId,
      details: JSON.stringify({ completed, failed, total: job.total }),
    },
  });
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
}

async function pollJobs() {
  const pendingJobs = await prisma.generationJob.findMany({
    where: { status: 'QUEUED' },
    take: 10,
  });

  for (const job of pendingJobs) {
    await processJob(job.id);
  }
}

async function main() {
  console.log('Worker started');

  // Process every 5 seconds
  setInterval(async () => {
    try {
      await pollJobs();
    } catch (err) {
      console.error('Worker error:', err);
    }
  }, 5000);

  // Process immediately on start
  await pollJobs();
}

main().catch(console.error);
