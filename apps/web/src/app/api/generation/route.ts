// Generation API Route
import { NextRequest, NextResponse } from "next/server";
import { getSession, getUserFromSession, requirePermission } from '@/lib/auth';
import { createGenerationJob, completeGenerationJob, getGenerationJob, getJobProgress } from '@/lib/generation';
import { claimCertificateNumber } from '@/lib/certificates';
import { generateVerificationToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = request.nextUrl.searchParams.get('jobId');
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (jobId) {
      const job = await getGenerationJob(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      const progress = await getJobProgress(jobId);
      return NextResponse.json({ job, progress });
    }

    if (projectId) {
      const jobs = await prisma.generationJob.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      const enriched = await Promise.all(jobs.map(async (job) => {
        const progress = await getJobProgress(job.id);
        return { job, progress };
      }));

      return NextResponse.json({ jobs: enriched });
    }

    return NextResponse.json({ error: 'Job ID or Project ID required' }, { status: 400 });
  } catch (error) {
    console.error('Generation jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromSession(session);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, recipients } = body;

    if (!projectId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ error: 'Project ID and recipients array are required' }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients to generate certificates for' }, { status: 400 });
    }

    // Verify project access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await requirePermission(user.id, project.organizationId, 'ADMIN');

    // Find the latest published template version
    const template = await prisma.template.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!template) {
      return NextResponse.json({ error: 'No template found for this project' }, { status: 400 });
    }

    const templateVersion = await prisma.templateVersion.findFirst({
      where: { templateId: template.id },
      orderBy: { version: 'desc' },
    });

    if (!templateVersion) {
      return NextResponse.json({ error: 'No template version found' }, { status: 400 });
    }

    // Create generation job
    const { job, certificateIds } = await createGenerationJob(
      projectId,
      user.id,
      recipients.length,
      recipients.map((r: any) => ({
        recipientId: r.recipientId || '',
        name: r.name,
        email: r.email,
        metadata: r.metadata || {},
      }))
    );

    // Update certificates with numbers and tokens
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const certificateId = certificateIds[i];

      const { certificateNumber } = await claimCertificateNumber(projectId, new Date().getFullYear());
      const verificationToken = generateVerificationToken();

      await prisma.certificate.update({
        where: { id: certificateId },
        data: { certificateNumber, verificationToken },
      });
    }

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    return NextResponse.json({
      job: {
        id: job.id,
        status: "PROCESSING",
        total: job.total,
        completed: job.completed,
        failed: job.failed,
      },
      certificateCount: certificateIds.length,
      message: `Successfully queued ${certificateIds.length} certificates for generation`,
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start generation' }, { status: 500 });
  }
}