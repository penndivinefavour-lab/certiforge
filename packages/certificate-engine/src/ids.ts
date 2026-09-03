// CertiForge Certificate ID Engine
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CertificateIdConfig {
  prefix: string;
  yearLength: number;
  sequenceLength: number;
}

const DEFAULT_CONFIG: CertificateIdConfig = {
  prefix: 'CERT',
  yearLength: 4,
  sequenceLength: 6
};

export function generateCertificateId(config: CertificateIdConfig = DEFAULT_CONFIG): string {
  const year = new Date().getFullYear().toString().slice(-config.yearLength);
  // Sequence will be determined by database
  return `${config.prefix}-${year}-000001`;
}

export async function claimCertificateNumber(projectId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // Lock the certificate_sequences row
    const sequence = await tx.certificateSequence.findUniqueOrThrow({
      where: { projectId }
    });
    
    const year = new Date().getFullYear().toString();
    const nextNum = sequence.currentNumber + 1;
    
    // Update sequence
    await tx.certificateSequence.update({
      where: { projectId },
      data: { currentNumber: nextNum }
    });
    
    // Format: CERT-2026-000001
    return `CERT-${year}-${nextNum.toString().padStart(6, '0')}`;
  });
}

export function parseCertificateId(id: string): { prefix: string; year: string; number: number } | null {
  const match = id.match(/^(.+?)-(\d{4})-(\d+)$/);
  if (!match) return null;
  
  return {
    prefix: match[1],
    year: match[2],
    number: parseInt(match[3], 10)
  };
}

export function validateCertificateId(id: string, config: CertificateIdConfig = DEFAULT_CONFIG): boolean {
  const year = new Date().getFullYear().toString();
  const pattern = new RegExp(`^${config.prefix}-${year}-\\d{${config.sequenceLength}}$`);
  return pattern.test(id);
}
