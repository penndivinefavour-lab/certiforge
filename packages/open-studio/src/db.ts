// Open Studio IndexedDB Storage Layer - Phase 5.8.3 Runtime Stabilization
// Provides local persistence for the no-auth certificate generation workflow

// Ensure browser types are available
/// <reference lib="dom" />

const DB_NAME = 'certiforge-open-studio';
const DB_VERSION = 1;
const INIT_TIMEOUT_MS = 5000; // 5 second safety timeout

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

export interface OpenStudioGenerationJob {
  id: string;
  projectId: string;
  status: string;
  total: number;
  completed?: number;
  failed?: number;
  createdAt: number;
  completedAt?: number;
}

// Generate secure random ID
function generateId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Database class with robust initialization
class OpenStudioDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    console.log('[CertiForge][OpenStudio] IndexedDB init START');

    // Return existing promise if already initializing (idempotent)
    if (this.initPromise) {
      console.log('[CertiForge][OpenStudio] IndexedDB init reusing existing promise');
      return this.initPromise;
    }

    // If already initialized, return immediately
    if (this.isInitialized && this.db) {
      console.log('[CertiForge][OpenStudio] IndexedDB already initialized');
      return;
    }

    // Safety timeout - ensure we never hang indefinitely
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('[CertiForge][OpenStudio] IndexedDB init timeout after 5s'));
      }, INIT_TIMEOUT_MS);
    });

    this.initPromise = new Promise<void>((resolve, reject) => {
      // Check if indexedDB is available
      if (typeof indexedDB === 'undefined' || !indexedDB) {
        console.error('[CertiForge][OpenStudio][ERROR] indexedDB not available');
        this.initPromise = null;
        reject(new Error('IndexedDB is not available in this browser'));
        return;
      }

      const startTime = performance.now();
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        const elapsed = performance.now() - startTime;
        console.error(`[CertiForge][OpenStudio][ERROR] IndexedDB open failed after ${elapsed.toFixed(0)}ms:`, request.error);
        this.initPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('[CertiForge][OpenStudio] Database blocked - another tab may have it open');
        // Don't reject here - we'll wait for unblock or handle gracefully
      };

      request.onsuccess = () => {
        const elapsed = performance.now() - startTime;
        this.db = request.result;
        this.isInitialized = true;
        this.initPromise = null;
        console.log(`[CertiForge][OpenStudio] IndexedDB init END (${elapsed.toFixed(0)}ms)`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[CertiForge][OpenStudio] Database upgrade needed');

        // Create all stores if they don't exist
        const createStore = (name: string, keyPath: string, indexes: string[]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });
            indexes.forEach(idx => store.createIndex(idx, idx));
            console.log(`[CertiForge][OpenStudio] Created store: ${name}`);
          }
        };

        createStore(STORES.WORKSPACES, 'id', ['createdAt']);
        createStore(STORES.PROJECTS, 'id', ['workspaceId', 'name', 'createdAt']);
        createStore(STORES.TEMPLATES, 'id', ['projectId', 'createdAt']);
        createStore(STORES.RECIPIENTS, 'id', ['projectId', 'name']);
        createStore(STORES.CERTIFICATES, 'id', ['projectId', 'recipientId', 'certificateNumber', 'status']);
        createStore(STORES.GENERATION_JOBS, 'id', []);
      };
    });

    // Race the init against the timeout
    try {
      await Promise.race([this.initPromise, timeoutPromise]);
    } catch (error) {
      this.initPromise = null;
      throw error;
    }

    return this.initPromise;
  }

  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('[CertiForge][OpenStudio] Database not initialized');
    }

    console.log(`[CertiForge][OpenStudio] withStore START: ${storeName} (${mode})`);
    const startTime = performance.now();

    return new Promise<T>((resolve, reject) => {
      let transaction: IDBTransaction | null = null;

      try {
        transaction = this.db.transaction([storeName], mode);
      } catch (error) {
        const elapsed = performance.now() - startTime;
        console.error(`[CertiForge][OpenStudio][ERROR] withStore transaction failed after ${elapsed.toFixed(0)}ms:`, error);
        reject(error);
        return;
      }

      const store = transaction.objectStore(storeName);

      // Handle the callback result
      callback(store)
        .then(result => {
          const elapsed = performance.now() - startTime;
          console.log(`[CertiForge][OpenStudio] withStore END: ${storeName} (${elapsed.toFixed(0)}ms)`);
          resolve(result);
        })
        .catch(error => {
          const elapsed = performance.now() - startTime;
          console.error(`[CertiForge][OpenStudio][ERROR] withStore callback failed after ${elapsed.toFixed(0)}ms:`, error);
          reject(error);
        });

      // Transaction event handlers
      transaction.oncomplete = () => {
        // Success
      };

      transaction.onerror = (event) => {
        const error = transaction?.error || event.target;
        console.error(`[CertiForge][OpenStudio][ERROR] withStore transaction error:`, error);
        reject(error);
      };

      transaction.onabort = (event) => {
        const error = transaction?.error || new Error('Transaction aborted');
        console.error(`[CertiForge][OpenStudio][ERROR] withStore transaction aborted:`, error);
        reject(error);
      };
    });
  }

  // Workspace operations - MUST use readwrite for potential creation
  async getOrCreateWorkspace(): Promise<OpenStudioWorkspace> {
    console.log('[CertiForge][OpenStudio] getOrCreateWorkspace START');
    const startTime = performance.now();

    // Use readwrite because we may need to create a workspace
    const workspaces = await this.withStore(STORES.WORKSPACES, 'readwrite', async (store) => {
      const request = store.getAll();
      return new Promise<OpenStudioWorkspace[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as OpenStudioWorkspace[]);
        request.onerror = () => reject(request.error);
      });
    });

    if (workspaces.length > 0) {
      const elapsed = performance.now() - startTime;
      console.log(`[CertiForge][OpenStudio] getOrCreateWorkspace END (existing, ${elapsed.toFixed(0)}ms)`);
      return workspaces[0];
    }

    // Create new workspace - now we can write because we're in readwrite mode
    const workspace: OpenStudioWorkspace = {
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.withStore(STORES.WORKSPACES, 'readwrite', async (store) => {
      const request = store.add(workspace);
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    const elapsed = performance.now() - startTime;
    console.log(`[CertiForge][OpenStudio] getOrCreateWorkspace END (created new, ${elapsed.toFixed(0)}ms)`);
    return workspace;
  }

  async getWorkspace(workspaceId: string): Promise<OpenStudioWorkspace | null> {
    return this.withStore(STORES.WORKSPACES, 'readonly', (store) => {
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
    await this.withStore(STORES.PROJECTS, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(newProject);
        request.onsuccess = () => resolve(newProject);
        request.onerror = () => reject(request.error);
      });
    });
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
    return this.withStore(STORES.PROJECTS, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(projectId);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
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
    await this.withStore(STORES.TEMPLATES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(newTemplate);
        request.onsuccess = () => resolve(newTemplate);
        request.onerror = () => reject(request.error);
      });
    });
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
    await this.withStore(STORES.RECIPIENTS, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(newRecipient);
        request.onsuccess = () => resolve(newRecipient);
        request.onerror = () => reject(request.error);
      });
    });
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
        await new Promise<void>((resolve, reject) => {
          const request = store.add(recipient);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
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
    await this.withStore(STORES.CERTIFICATES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(newCertificate);
        request.onsuccess = () => resolve(newCertificate);
        request.onerror = () => reject(request.error);
      });
    });
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
        request.onsuccess = () => {
          const results = request.result as OpenStudioCertificate[];
          resolve(results[0] || null);
        };
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
  async createGenerationJob(job: Omit<OpenStudioGenerationJob, 'id'>): Promise<OpenStudioGenerationJob> {
    const newJob: OpenStudioGenerationJob = {
      ...job,
      id: generateId(),
    };
    await this.withStore(STORES.GENERATION_JOBS, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.add(newJob);
        request.onsuccess = () => resolve(newJob);
        request.onerror = () => reject(request.error);
      });
    });
    return newJob;
  }

  async updateGenerationJob(jobId: string, updates: Partial<OpenStudioGenerationJob>): Promise<void> {
    return this.withStore(STORES.GENERATION_JOBS, 'readwrite', async (store) => {
      const job = await this.getGenerationJob(jobId);
      if (!job) throw new Error('Job not found');
      store.put({ ...job, ...updates });
    });
  }

  async getGenerationJob(jobId: string): Promise<OpenStudioGenerationJob | null> {
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

  async clearAll(): Promise<void> {
    await this.withStore(STORES.WORKSPACES, 'readwrite', async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    await this.withStore(STORES.PROJECTS, 'readwrite', async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    await this.withStore(STORES.TEMPLATES, 'readwrite', async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    await this.withStore(STORES.RECIPIENTS, 'readwrite', async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    await this.withStore(STORES.CERTIFICATES, 'readwrite', async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    await this.withStore(STORES.GENERATION_JOBS, 'readwrite', async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }
}

// Singleton instance
export const openStudioDB = new OpenStudioDB();

// NOTE: Do NOT call init() here. Initialization should be explicit
// when needed by components. Leaving this would cause issues in SSR.

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
