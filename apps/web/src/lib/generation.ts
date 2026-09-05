// Generation job management (self-contained)
import { query, queryOne, execute } from './db';
import { generateVerificationToken } from './auth';
import type { GenerationJob, GenerationJobStatus, JobItemStatus } from '@certiforge/types';

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
  const jobResult = await query(
    `INSERT INTO generation_jobs (projectId, userId, status, total, completed, failed, createdAt) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
    [projectId, userId, 'QUEUED', totalRecipients, 0, 0]
  );
  const job = jobResult[0] as GenerationJob;

  const certificateIds: string[] = [];

  for (const recipient of certificateRecipients) {
    const certResult = await query(
      `INSERT INTO certificates (projectId, recipientId, certificateNumber, verificationToken, status, metadata, createdAt) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [
        projectId,
        recipient.recipientId,
        `TEMP-${Date.now()}-${certificateIds.length}`,
        generateVerificationToken(),
        'DRAFT',
        JSON.stringify(recipient.metadata || {})
      ]
    );
    const cert = certResult[0];

    certificateIds.push(cert.id);

    await query(
      `INSERT INTO generation_job_items (generationJobId, certificateId, status, attempts, createdAt) VALUES ($1, $2, $3, $4, NOW())`,
      [job.id, cert.id, 'PENDING', 1]
    );
  }

  await query(
    `INSERT INTO audit_logs (userId, organizationId, action, resourceType, resourceId, details, createdAt) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [userId, projectId, 'GENERATION_JOB_CREATED', 'generation_job', job.id, JSON.stringify({ totalRecipients, certificateIds: certificateIds.length })]
  );

  return { job, certificateIds };
}

export async function startGenerationJob(jobId: string): Promise<void> {
  await execute(
    'UPDATE generation_jobs SET status = $1, startedAt = NOW() WHERE id = $2',
    ['PROCESSING', jobId]
  );
}

export async function completeJobItem(
  jobItemId: string,
  certificateId: string,
  pdfUrl: string
): Promise<void> {
  await execute(
    'UPDATE generation_job_items SET status = $1, attempts = attempts + 1 WHERE id = $2',
    ['COMPLETED', jobItemId]
  );

  await execute(
    'UPDATE certificates SET status = $1, pdfUrl = $2, issuedAt = NOW() WHERE id = $3',
    ['GENERATED', pdfUrl, certificateId]
  );

  const jobItem = await queryOne('SELECT generationJobId FROM generation_job_items WHERE id = $1', [jobItemId]);
  if (jobItem) {
    await execute(
      'UPDATE generation_jobs SET completed = completed + 1 WHERE id = $1',
      [jobItem.generationJobId]
    );
  }
}

export async function completeGenerationJob(jobId: string, outputUrl: string): Promise<void> {
  await execute(
    'UPDATE generation_jobs SET status = $1, completedAt = NOW(), outputUrl = $2 WHERE id = $3',
    ['COMPLETED', outputUrl, jobId]
  );
}

export async function getGenerationJob(jobId: string): Promise<GenerationJob | null> {
  const result = await queryOne('SELECT * FROM generation_jobs WHERE id = $1', [jobId]);
  return result as GenerationJob | null;
}

export async function getJobProgress(jobId: string) {
  const job = await getGenerationJob(jobId);
  if (!job) return null;

  const items = await query(
    'SELECT * FROM generation_job_items WHERE generationJobId = $1',
    [jobId]
  );

  return {
    job,
    items: items.map((item: any) => ({
      ...item,
      certificate: item.certificate || null
    }))
  };
}

export async function failJobItem(jobItemId: string, error: string): Promise<void> {
  await execute(
    'UPDATE generation_job_items SET status = $1, error = $2 WHERE id = $3',
    ['FAILED', error, jobItemId]
  );

  const jobItem = await queryOne('SELECT generationJobId FROM generation_job_items WHERE id = $1', [jobItemId]);
  if (jobItem) {
    await execute(
      'UPDATE generation_jobs SET failed = failed + 1 WHERE id = $1',
      [jobItem.generationJobId]
    );
  }
}

export async function cancelGenerationJob(jobId: string): Promise<void> {
  await execute(
    'UPDATE generation_jobs SET status = $1, completedAt = NOW() WHERE id = $2',
    ['CANCELLED', jobId]
  );

  await execute(
    'UPDATE generation_job_items SET status = $1 WHERE generationJobId = $2',
    ['CANCELLED', jobId]
  );
}
