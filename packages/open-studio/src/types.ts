// Types for Open Studio
export interface OpenStudioProject {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  state: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: number;
  updatedAt: number;
}

export interface OpenStudioTemplate {
  id: string;
  projectId: string;
  name: string;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  elements: any[];
  backgroundColor?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OpenStudioRecipient {
  id: string;
  projectId: string;
  name: string;
  email?: string;
  metadata: Record<string, string>;
  createdAt: number;
}

export interface OpenStudioCertificate {
  id: string;
  projectId: string;
  recipientId: string;
  templateId: string;
  certificateNumber: string;
  verificationToken: string;
  status: 'DRAFT' | 'GENERATED' | 'ISSUED' | 'REVOKED';
  pdfData?: string;
  qrData?: string;
  metadata?: Record<string, string>;
  issuedAt?: number;
  createdAt: number;
}

export interface OpenStudioWorkspace {
  id: string;
  createdAt: number;
  updatedAt: number;
  settings?: {
    orgName?: string;
    lastProjectId?: string;
  };
}
