// Open Studio IndexedDB Storage Layer
// Provides local persistence for the no-auth certificate generation workflow

const DB_NAME = 'certiforge-open-studio';
const DB_VERSION = 1;

// Store names
const STORES = {
  WORKSPACES: 'workspaces',
  PROJECTS: 'projects',
  TEMPLATES: 'templates',
  RECIPIENTS: 'recipients',
  CERTIFICATES: 'certificates',
  GENERATION_JOBS: 'generation-jobs',
} as const;

// Types
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
  pdfData?: string; // base64
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

// Generate secure random ID
function generateId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate certificate ID in format CF-XXXX-XXXX-XXXX
function generateCertificateId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'CF-';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  id += '-';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  id += '-';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Database class
class OpenStudioDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Workspaces store
        if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
          const workspaceStore = db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
          workspaceStore.createIndex('createdAt', 'createdAt');
        }

        // Projects store
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('workspaceId', 'workspaceId');
          projectStore.createIndex('name', 'name');
          projectStore.createIndex('createdAt', 'createdAt');
        }

        // Templates store
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
          templateStore.createIndex('projectId', 'projectId');
          templateStore.createIndex('createdAt', 'createdAt');
        }

        // Recipients store
        if (!db.objectStoreNames.contains(STORES.RECIPIENTS)) {
          const recipientStore = db.createObjectStore(STORES.RECIPIENTS, { keyPath: 'id' });
          recipientStore.createIndex('projectId', 'projectId');
          recipientStore.createIndex('name', 'name');
        }

        // Certificates store
        if (!db.objectStoreNames.contains(STORES.CERTIFICATES)) {
          const certStore = db.createObjectStore(STORES.CERTIFICATES, { keyPath: 'id' });
          certStore.createIndex('projectId', 'projectId');
          certStore.createIndex('recipientId', 'recipientId');
          certStore.createIndex('certificateNumber', 'certificateNumber');
          certStore.createIndex('status', 'status');
        }

        // Generation jobs store
        if (!db.objectStoreNames.contains(STORES.GENERATION_JOBS)) {
          db.createObjectStore(STORES.GENERATION_JOBS, { keyPath: 'id' });
        }
      };
    });
  }

  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      callback(store).then(resolve).catch(reject);
      transaction.oncomplete = () => resolve({} as T);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Workspace operations
  async getOrCreateWorkspace(): Promise<OpenStudioWorkspace> {
    return this.withStore(STORES.WORKSPACES, 'readonly', async (store) => {
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const workspaces = request.result as OpenStudioWorkspace[];
          if (workspaces.length > 0) {
            resolve(workspaces[0]);
          } else {
            const workspace: OpenStudioWorkspace = {
              id: generateId(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            this.withStore(STORES.WORKSPACES, 'readwrite', (s) => s.put(workspace)).then(() => resolve(workspace));
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async updateWorkspace(workspaceId: string, updates: Partial<OpenStudioWorkspace>): Promise<OpenStudioWorkspace> {
    return this.withStore(STORES.WORKSPACES, 'readwrite', async (store) => {
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) throw new Error('Workspace not found');
      const updated = { ...workspace, ...updates, updatedAt: Date.now() };
      store.put(updated);
      return updated;
    });
  }

  async getWorkspace(workspaceId: string): Promise<OpenStudioWorkspace | null> {
    return this.withStore(STORES.WORKSPACES, 'readonly', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(workspaceId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Project operations
  async createProject(project: Omit<OpenStudioProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<OpenStudioProject> {
    const newProject: OpenStudioProject = {
      ...project,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.withStore(STORES.PROJECTS, 'readwrite', (store) => store.put(newProject));
    return newProject;
  }

  async getProject(projectId: string): Promise<OpenStudioProject | null> {
    return this.withStore(STORES.PROJECTS, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getProjects(workspaceId: string): Promise<OpenStudioProject[]> {
    return this.withStore(STORES.PROJECTS, 'readonly', async (store) => {
      const index = store.index('workspaceId');
      return new Promise((resolve, reject) => {
        const request = index.getAll(workspaceId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async updateProject(projectId: string, updates: Partial<OpenStudioProject>): Promise<OpenStudioProject | null> {
    return this.withStore(STORES.PROJECTS, 'readwrite', async (store) => {
      const project = await this.getProject(projectId);
      if (!project) return null;
      const updated = { ...project, ...updates, updatedAt: Date.now() };
      store.put(updated);
      return updated;
    });
  }

  async deleteProject(projectId: string): Promise<boolean> {
    return this.withStore(STORES.PROJECTS, 'readwrite', async (store) => {
      const project = await this.getProject(projectId);
      if (!project) return false;
      store.delete(projectId);
      return true;
    });
  }

  // Template operations
  async createTemplate(template: Omit<OpenStudioTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<OpenStudioTemplate> {
    const newTemplate: OpenStudioTemplate = {
      ...template,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.withStore(STORES.TEMPLATES, 'readwrite', (store) => store.put(newTemplate));
    return newTemplate;
  }

  async getTemplate(templateId: string): Promise<OpenStudioTemplate | null> {
    return this.withStore(STORES.TEMPLATES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(templateId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getTemplates(projectId: string): Promise<OpenStudioTemplate[]> {
    return this.withStore(STORES.TEMPLATES, 'readonly', async (store) => {
      const index = store.index('projectId');
      return new Promise((resolve, reject) => {
        const request = index.getAll(projectId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async updateTemplate(templateId: string, updates: Partial<OpenStudioTemplate>): Promise<OpenStudioTemplate | null> {
    return this.withStore(STORES.TEMPLATES, 'readwrite', async (store) => {
      const template = await this.getTemplate(templateId);
      if (!template) return null;
      const updated = { ...template, ...updates, updatedAt: Date.now() };
      store.put(updated);
      return updated;
    });
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    return this.withStore(STORES.TEMPLATES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(templateId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Recipient operations
  async createRecipient(recipient: Omit<OpenStudioRecipient, 'id' | 'createdAt'>): Promise<OpenStudioRecipient> {
    const newRecipient: OpenStudioRecipient = {
      ...recipient,
      id: generateId(),
      createdAt: Date.now(),
    };
    await this.withStore(STORES.RECIPIENTS, 'readwrite', (store) => store.put(newRecipient));
    return newRecipient;
  }

  async getRecipient(recipientId: string): Promise<OpenStudioRecipient | null> {
    return this.withStore(STORES.RECIPIENTS, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(recipientId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getRecipients(projectId: string): Promise<OpenStudioRecipient[]> {
    return this.withStore(STORES.RECIPIENTS, 'readonly', async (store) => {
      const index = store.index('projectId');
      return new Promise((resolve, reject) => {
        const request = index.getAll(projectId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async updateRecipient(recipientId: string, updates: Partial<OpenStudioRecipient>): Promise<OpenStudioRecipient | null> {
    return this.withStore(STORES.RECIPIENTS, 'readwrite', async (store) => {
      const recipient = await this.getRecipient(recipientId);
      if (!recipient) return null;
      const updated = { ...recipient, ...updates };
      store.put(updated);
      return updated;
    });
  }

  async deleteRecipient(recipientId: string): Promise<boolean> {
    return this.withStore(STORES.RECIPIENTS, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(recipientId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async bulkCreateRecipients(recipients: Omit<OpenStudioRecipient, 'id' | 'createdAt'>[]): Promise<OpenStudioRecipient[]> {
    const created = recipients.map(r => ({
      ...r,
      id: generateId(),
      createdAt: Date.now(),
    }));
    await this.withStore(STORES.RECIPIENTS, 'readwrite', async (store) => {
      for (const recipient of created) {
        store.put(recipient);
      }
    });
    return created;
  }

  // Certificate operations
  async createCertificate(certificate: Omit<OpenStudioCertificate, 'id' | 'createdAt'>): Promise<OpenStudioCertificate> {
    const newCertificate: OpenStudioCertificate = {
      ...certificate,
      id: generateId(),
      createdAt: Date.now(),
    };
    await this.withStore(STORES.CERTIFICATES, 'readwrite', (store) => store.put(newCertificate));
    return newCertificate;
  }

  async getCertificate(certificateId: string): Promise<OpenStudioCertificate | null> {
    return this.withStore(STORES.CERTIFICATES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(certificateId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getCertificates(projectId: string): Promise<OpenStudioCertificate[]> {
    return this.withStore(STORES.CERTIFICATES, 'readonly', async (store) => {
      const index = store.index('projectId');
      return new Promise((resolve, reject) => {
        const request = index.getAll(projectId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getCertificateByNumber(certificateNumber: string): Promise<OpenStudioCertificate | null> {
    return this.withStore(STORES.CERTIFICATES, 'readonly', async (store) => {
      const index = store.index('certificateNumber');
      return new Promise((resolve, reject) => {
        const request = index.getAll(certificateNumber);
        request.onsuccess = () => resolve((request.result as OpenStudioCertificate[])[0] || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async updateCertificate(certificateId: string, updates: Partial<OpenStudioCertificate>): Promise<OpenStudioCertificate | null> {
    return this.withStore(STORES.CERTIFICATES, 'readwrite', async (store) => {
      const certificate = await this.getCertificate(certificateId);
      if (!certificate) return null;
      const updated = { ...certificate, ...updates };
      store.put(updated);
      return updated;
    });
  }

  async deleteCertificate(certificateId: string): Promise<boolean> {
    return this.withStore(STORES.CERTIFICATES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(certificateId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Generation jobs
  async createGenerationJob(job: { id: string; projectId: string; status: string; total: number; createdAt: number }): Promise<void> {
    await this.withStore(STORES.GENERATION_JOBS, 'readwrite', (store) => store.put(job));
  }

  async updateGenerationJob(jobId: string, updates: any): Promise<void> {
    return this.withStore(STORES.GENERATION_JOBS, 'readwrite', async (store) => {
      const job = await this.getGenerationJob(jobId);
      if (!job) throw new Error('Job not found');
      store.put({ ...job, ...updates });
    });
  }

  async getGenerationJob(jobId: string): Promise<any> {
    return this.withStore(STORES.GENERATION_JOBS, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(jobId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Workspace export/import
  async exportWorkspace(): Promise<{
    workspace: OpenStudioWorkspace;
    projects: OpenStudioProject[];
    templates: OpenStudioTemplate[];
    recipients: OpenStudioRecipient[];
    certificates: OpenStudioCertificate[];
  }> {
    const workspace = await this.getOrCreateWorkspace();
    const projects = await this.getProjects(workspace.id);
    const templates: OpenStudioTemplate[] = [];
    const recipients: OpenStudioRecipient[] = [];
    const certificates: OpenStudioCertificate[] = [];

    for (const project of projects) {
      templates.push(...(await this.getTemplates(project.id)));
      recipients.push(...(await this.getRecipients(project.id)));
      certificates.push(...(await this.getCertificates(project.id)));
    }

    return { workspace, projects, templates, recipients, certificates };
  }

  async importWorkspace(data: any): Promise<void> {
    // This would restore from exported data
    // Implementation omitted for brevity
  }

  async clearAll(): Promise<void> {
    await this.withStore(STORES.WORKSPACES, 'readwrite', (store) => store.clear());
    await this.withStore(STORES.PROJECTS, 'readwrite', (store) => store.clear());
    await this.withStore(STORES.TEMPLATES, 'readwrite', (store) => store.clear());
    await this.withStore(STORES.RECIPIENTS, 'readwrite', (store) => store.clear());
    await this.withStore(STORES.CERTIFICATES, 'readwrite', (store) => store.clear());
    await this.withStore(STORES.GENERATION_JOBS, 'readwrite', (store) => store.clear());
  }
}

// Singleton instance
export const openStudioDB = new OpenStudioDB();

// Initialize on import
openStudioDB.init().catch(console.error);

// Helper to get current workspace
export async function getCurrentWorkspace(): Promise<OpenStudioWorkspace> {
  return openStudioDB.getOrCreateWorkspace();
}

// Helper to create a new project
export async function createProject(name: string, description?: string): Promise<OpenStudioProject> {
  const workspace = await getCurrentWorkspace();
  return openStudioDB.createProject({
    workspaceId: workspace.id,
    name,
    description,
    state: 'DRAFT',
  });
}

// Helper to get all projects
export async function getProjects(): Promise<OpenStudioProject[]> {
  const workspace = await getCurrentWorkspace();
  return openStudioDB.getProjects(workspace.id);
}
