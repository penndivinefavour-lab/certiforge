// Certificate operations (self-contained)
import { query, queryOne, execute } from './db';
import { generateVerificationToken } from './auth';

export interface CertificateIdResult {
  certificateNumber: string;
  sequenceId: string;
  nextNumber: number;
}

export function formatCertificateNumber(year: number, sequence: number): string {
  return `CERT-${year}-${sequence.toString().padStart(6, "0")}`;
}

export async function claimCertificateNumber(
  projectId: string,
  year: number
): Promise<CertificateIdResult> {
  let sequence = await queryOne(
    'SELECT * FROM certificate_sequences WHERE projectId = $1 AND year = $2 LIMIT 1',
    [projectId, year]
  );

  if (!sequence) {
    const result = await query(
      'INSERT INTO certificate_sequences (projectId, year, nextNumber, createdAt) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [projectId, year, 1]
    );
    sequence = result[0];
  }

  const certNumber = formatCertificateNumber(sequence.year, sequence.nextNumber);
  const nextSeq = sequence.nextNumber + 1;

  await execute(
    'UPDATE certificate_sequences SET nextNumber = $1 WHERE id = $2',
    [nextSeq, sequence.id]
  );

  return {
    certificateNumber: certNumber,
    sequenceId: sequence.id,
    nextNumber: nextSeq,
  };
}

export function isValidCertificateNumber(certNum: string): boolean {
  return /^CERT-\d{4}-\d{6}$/.test(certNum);
}

export function parseCertificateNumber(certNum: string): { year: number; sequence: number } | null {
  const match = certNum.match(/^CERT-(\d{4})-(\d{6})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

export async function getCertificateSequence(projectId: string, year: number): Promise<number> {
  const sequence = await queryOne(
    'SELECT * FROM certificate_sequences WHERE projectId = $1 AND year = $2 LIMIT 1',
    [projectId, year]
  );
  return sequence?.nextNumber ?? 1;
}

export function shortVerificationToken(fullToken: string): string {
  return fullToken.slice(0, 12);
}

export async function revokeCertificate(
  certificateId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  const cert = await queryOne(
    'SELECT * FROM certificates WHERE id = $1',
    [certificateId]
  );

  if (!cert) {
    throw new Error("Certificate not found");
  }
  if (cert.status === "REVOKED") {
    throw new Error("Certificate is already revoked");
  }

  await execute(
    'UPDATE certificates SET status = $1, revocationReason = $2, revokedAt = NOW() WHERE id = $3',
    ['REVOKED', reason, certificateId]
  );

  await execute(
    'INSERT INTO audit_logs (userId, organizationId, action, resourceType, resourceId, details, createdAt) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [revokedBy, cert.organizationId, 'CERTIFICATE_REVOKED', 'certificate', certificateId, JSON.stringify({ reason })]
  );
}

export async function getCertificate(id: string) {
  return await queryOne('SELECT * FROM certificates WHERE id = $1', [id]);
}

export async function findCertificate(verificationToken: string) {
  return await queryOne('SELECT * FROM certificates WHERE verificationToken = $1', [verificationToken]);
}
