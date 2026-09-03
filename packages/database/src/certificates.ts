// Certificate ID engine - deterministic, collision-free certificate numbers
import { prisma } from "./client";
import { revalidatePath } from "next/cache";
import type { CertificateStatus } from "../../packages/types/src/index.ts";

export interface CertificateIdResult {
  certificateNumber: string;
  sequenceId: string;
  nextNumber: number;
}

// Format: CERT-{YEAR}-{SEQUENCE:6 digits}
// Example: CERT-2026-000001
export function formatCertificateNumber(year: number, sequence: number): string {
  return `CERT-${year}-${sequence.toString().padStart(6, "0")}`;
}

export async function claimCertificateNumber(
  projectId: string,
  year: number
): Promise<CertificateIdResult> {
  // Find or create a certificate sequence for this project/year
  let sequence = await prisma.certificateSequence.findFirst({
    where: { projectId, year },
  });

  if (!sequence) {
    sequence = await prisma.certificateSequence.create({
      data: {
        projectId,
        year,
        nextNumber: 1,
      },
    });
  }

  const certNumber = formatCertificateNumber(sequence.year, sequence.nextNumber);
  const nextSeq = sequence.nextNumber + 1;

  // Atomically increment
  await prisma.certificateSequence.update({
    where: { id: sequence.id },
    data: { nextNumber: nextSeq },
  });

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

export async function getCertificateSequence(
  projectId: string,
  year: number
): Promise<number> {
  const sequence = await prisma.certificateSequence.findFirst({
    where: { projectId, year },
  });
  return sequence?.nextNumber ?? 1;
}

export function generateVerificationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function shortVerificationToken(fullToken: string): string {
  return fullToken.slice(0, 12);
}

// ============================================================================
// CERTIFICATE STATUS TRANSITIONS
// ============================================================================

export function canTransitionStatus(
  current: CertificateStatus,
  next: CertificateStatus
): boolean {
  const validTransitions: Record<CertificateStatus, CertificateStatus[]> = {
    DRAFT: ["GENERATED", "ISSUED"],
    GENERATED: ["ISSUED", "DRAFT"],
    ISSUED: ["REVOKED"],
    REVOKED: [],
  };
  return validTransitions[current]?.includes(next) ?? false;
}

// Revoke a certificate
export async function revokeCertificate(
  certificateId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  if (!prisma) throw new Error("Prisma client not initialized");
  
  await prisma.$transaction(async (tx) => {
    const cert = await tx.certificate.findUnique({
      where: { id: certificateId },
      include: { project: true },
    });
    if (!cert) {
      throw new Error("Certificate not found");
    }
    if (cert.status === "REVOKED") {
      throw new Error("Certificate is already revoked");
    }
    await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: "REVOKED",
        revocationReason: reason,
        revokedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId: cert.project.organizationId,
        projectId: cert.projectId,
        actorId: revokedBy,
        action: "CERTIFICATE_REVOKED",
        resourceType: "Certificate",
        resourceId: certificateId,
        details: JSON.stringify({ reason }),
      },
    });
  });
}