// CertiForge Types - Shared TypeScript types
export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ProjectState = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type CertificateStatus = 'DRAFT' | 'GENERATED' | 'ISSUED' | 'REVOKED';
export type GenerationJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED' | 'CANCELLED';
export type JobItemStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  user?: User;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  verificationDomain: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  createdAt: Date;
  organization?: Organization;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  state: ProjectState;
  createdAt: Date;
  updatedAt: Date;
}

export interface Template {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  format: 'PDF' | 'PNG' | 'JPG' | 'WEBP';
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  name: string | null;
  width: number;
  height: number;
  backgroundColor: string;
  orientation: 'portrait' | 'landscape';
  elements: string;
  background: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateElement {
  id: string;
  versionId: string;
  templateId: string;
  type: 'text' | 'image' | 'shape' | 'qr_code';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | null;
  content: string | null;
  style: Record<string, unknown> | null;
  dynamic: { field: string; fallback?: string } | null;
  zIndex: number;
  createdAt: Date;
}

export interface Recipient {
  id: string;
  organizationId: string;
  projectId: string | null;
  externalId: string | null;
  name: string;
  email: string | null;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  projectId: string;
  recipientId: string;
  templateVersionId: string;
  certificateNumber: string;
  verificationToken: string;
  status: CertificateStatus;
  issuedAt: Date | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  pdfUrl: string | null;
  qrUrl: string | null;
  qrDataUrl: string | null;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateEvent {
  id: string;
  certificateId: string;
  eventType: string;
  actorId: string | null;
  metadata: string;
  createdAt: Date;
}

export interface CertificateSequence {
  id: string;
  projectId: string;
  year: number;
  nextNumber: number;
  createdAt: Date;
}

export interface GenerationJob {
  id: string;
  projectId: string;
  userId: string;
  status: GenerationJobStatus;
  total: number;
  completed: number;
  failed: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationJobItem {
  id: string;
  generationJobId: string;
  certificateId: string;
  status: JobItemStatus;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  projectId: string | null;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface Asset {
  id: string;
  organizationId: string;
  name: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  lastUsed: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface RecipientImport {
  id: string;
  projectId: string;
  userId: string;
  fileName: string;
  fileType: string;
  parsedData: string;
  mapping: string;
  status: string;
  errorCount: number;
  warningCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipientImportRow {
  id: string;
  importId: string;
  rowNumber: number;
  data: string;
  errors: string;
}

export interface RecipientMapping {
  id: string;
  importId: string;
  sourceColumn: string;
  targetField: string;
  required: boolean;
}
