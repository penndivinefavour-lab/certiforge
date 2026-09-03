// CertiForge Worker - Background job processor for certificate generation
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { generateCert } from '@/pdf-engine';

const prisma = new PrismaClient();

const QUEUE_NAME = 'certiforge:generation';

async function main() {
  const queue = new Queue(QUEUE_NAME, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  const worker = new Worker(QUEUE_NAME, async (job) => {
    const { templateId, recipientIds } = job.data;
    
    for (const recipientId of recipientIds) {
      await generateCert(templateId, recipientId);
    }
  }, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  worker.on('completed', async (job) => {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED' }
    });
  });

  worker.on('failed', async (job, err) => {
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', error: err.message }
    });
  });

  console.log('Worker started');
}

main().catch(console.error);
