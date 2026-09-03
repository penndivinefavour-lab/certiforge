// CertiForge Types - Shared TypeScript types and Zod schemas
import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────
export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ProjectState = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type CertificateStatus = 'DRAFT' | 'GENERATED' | 'ISSUED' | 'REVOKED';
export type GenerationJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED' | 'CANCELLED';
export type AuditEventType = 
  | 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_DELETED'
  | 'TEMPLATE_CREATED' | 'TEMPLATE_UPDATED' | 'TEMPLATE_DELETED'
  | 'RECIPIENT_IMPORTED' | 'RECIPIENT_ADDED' | 'RECIPIENT_DELETED'
  | 'CERTIFICATE_CREATED' | 'CERTIFICATE_GENERATED' | 'CERTIFICATE_ISSUED'
  | 'CERTIFICATE_DOWNLOADED' | 'CERTIFICATE_VERIFIED' | 'CERTIFICATE_REVOKED'
  | 'ORGANIZATION_UPDATED' | 'MEMBER_ADDED' | 'MEMBER_REMOVED';

// ── User ──────────────────────────────────────────────────────────────────────
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type User = z.infer<typeof userSchema>;

// ── Organization ──────────────────────────────────────────────────────────────
export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().optional(),
  verificationDomain: z.string().url().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Organization = z.infer<typeof organizationSchema>;

// ── Membership ────────────────────────────────────────────────────────────────
export const membershipSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']),
  createdAt: z.date()
});

export type Membership = z.infer<typeof membershipSchema>;

// ── Project ───────────────────────────────────────────────────────────────────
export const projectSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  state: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Project = z.infer<typeof projectSchema>;

// ── Template ──────────────────────────────────────────────────────────────────
export const templateSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  orientation: z.enum(['portrait', 'landscape']),
  paperWidth: z.number(),
  paperHeight: z.number(),
  paperUnit: z.enum(['mm', 'px', 'in']),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Template = z.infer<typeof templateSchema>;

// ── Template Version ──────────────────────────────────────────────────────────
export const templateVersionSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  version: z.number(),
  pdfUrl: z.string().url().nullable().optional(),
  elements: z.array(z.any()).optional(),
  backgroundColor: z.string().nullable().optional(),
  createdAt: z.date()
});

export type TemplateVersion = z.infer<typeof templateVersionSchema>;

// ── Template Element ──────────────────────────────────────────────────────────
export const templateElementSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  type: z.enum(['text', 'image', 'shape', 'qr_code']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  content: z.string().nullable().optional(),
  style: z.record(z.any(), z.any()).nullable().optional(),
  dynamic: z.object({
    field: z.string(),
    fallback: z.string().optional()
  }).nullable().optional(),
  zIndex: z.number().optional()
});

export type TemplateElement = z.infer<typeof templateElementSchema>;

// ── Recipient ─────────────────────────────────────────────────────────────────
export const recipientSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  externalId: z.string().nullable().optional(),
  name: z.string(),
  email: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string()).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Recipient = z.infer<typeof recipientSchema>;

// ── Certificate ───────────────────────────────────────────────────────────────
export const certificateSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  recipientId: z.string().uuid(),
  templateVersionId: z.string().uuid(),
  certificateNumber: z.string(),
  verificationToken: z.string(),
  status: z.enum(['DRAFT', 'GENERATED', 'ISSUED', 'REVOKED']),
  issuedAt: z.date().nullable().optional(),
  revokedAt: z.date().nullable().optional(),
  revocationReason: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  qrUrl: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string()).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Certificate = z.infer<typeof certificateSchema>;

// ── Generation Job ────────────────────────────────────────────────────────────
export const generationJobSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED', 'CANCELLED']),
  total: z.number(),
  completed: z.number(),
  failed: z.number(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  outputUrl: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type GenerationJob = z.infer<typeof generationJobSchema>;

// ── Generation Job Item ───────────────────────────────────────────────────────
export const generationJobItemSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  certificateId: z.string().uuid(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']),
  attempts: z.number(),
  error: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type GenerationJobItem = z.infer<typeof generationJobItemSchema>;

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  type: z.enum([
    'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
    'TEMPLATE_CREATED', 'TEMPLATE_UPDATED', 'TEMPLATE_DELETED',
    'RECIPIENT_IMPORTED', 'RECIPIENT_ADDED', 'RECIPIENT_DELETED',
    'CERTIFICATE_CREATED', 'CERTIFICATE_GENERATED', 'CERTIFICATE_ISSUED',
    'CERTIFICATE_DOWNLOADED', 'CERTIFICATE_VERIFIED', 'CERTIFICATE_REVOKED',
    'ORGANIZATION_UPDATED', 'MEMBER_ADDED', 'MEMBER_REMOVED'
  ]),
  metadata: z.record(z.any(), z.any()).nullable().optional(),
  createdAt: z.date()
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// ── Validation Schemas for API ────────────────────────────────────────────────
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/)
});

export const importRecipientsSchema = z.object({
  file: z.any(), // File type from browser - validated at runtime
  mappings: z.record(z.string(), z.string()).optional()
});
