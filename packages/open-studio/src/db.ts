// Open Studio IndexedDB Storage Layer
/// <reference lib="dom" />

const DB_NAME = 'certiforge-open-studio';
const DB_VERSION = 1;

const STORES = {
  WORKSPACES: 'workspaces',
  PROJECTS: 'projects',
  TEMPLATES: 'templates',
  RECIPIENTS: 'recipients',
  CERTIFICATES: 'certificates',
} as const;

export interface OpenStudioWorkspace {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface OpenStudioProject {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  state: string;
  createdAt: number;
  updatedAt: number;
}

export interface OpenStudioTemplate {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  canvasState?: any;
  createdAt: number;
  updatedAt: number;
}

export interface OpenStudioRecipient {
  id: string;
  projectId: string;
  name: string;
  email: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface OpenStudioCertificate {
  id: string;
  projectId: string;
  certificateNumber: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  templateId: string;
  status: 'PENDING' | 'GENERATED' | 'FAILED';
  pdfData?: string;
  qrCodeUrl?: string;
  generatedAt: number;
}

function generateId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

class OpenStudioDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    console.log('[OpenStudio] init START');
    
    // Return existing promise if already initializing
    if (this.initPromise) {
      console.log('[OpenStudio] init: reusing existing promise');
      return this.initPromise;
    }
    
    // Return if already initialized
    if (this.db) {
      console.log('[OpenStudio] init: already initialized');
      return;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        this.initPromise = null;
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OpenStudio] init FAILED:', request.error);
        this.initPromise = null;
        reject(request.error || new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        console.log('[OpenStudio] init SUCCESS');
        this.db = request.result;
        this.initPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[OpenStudio] creating stores for version', DB_VERSION);

        if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
          db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.RECIPIENTS)) {
          db.createObjectStore(STORES.RECIPIENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.CERTIFICATES)) {
          db.createObjectStore(STORES.CERTIFICATES, { keyPath: 'id' });
        }
        // Create generation_jobs store if it doesn't exist
        if (!db.objectStoreNames.contains('generation_jobs')) {
          db.createObjectStore('generation_jobs', { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  private async withStore<T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    if (!this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise<T>((resolve, reject) => {
      const transaction = this.db.transaction([storeName], mode);
      
      transaction.onerror = () => {
        reject(transaction.error || new Error('Transaction failed'));
      };
      
      transaction.oncomplete = () => {
        // Transaction completed
      };
      
      const store = transaction.objectStore(storeName);
      
      callback(store)
        .then(result => resolve(result))
        .catch(error => reject(error));
    });
  }

  async getOrCreateWorkspace(): Promise<OpenStudioWorkspace> {
    console.log('[OpenStudio] getOrCreateWorkspace');
    
    const workspaces = await this.withStore(STORES.WORKSPACES, 'readonly', (store) => {
      return new Promise<OpenStudioWorkspace[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });

    if (workspaces.length > 0) {
      console.log('[OpenStudio] using existing workspace');
      return workspaces[0];
    }

    console.log('[OpenStudio] creating new workspace');
    const workspace: OpenStudioWorkspace = {
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.withStore(STORES.WORKSPACES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(workspace);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return workspace;
  }

  async getProjects(workspaceId: string): Promise<OpenStudioProject[]> {
    console.log(`[OpenStudio] getProjects for ${workspaceId}`);
    
    const projects = await this.withStore(STORES.PROJECTS, 'readonly', (store) => {
      return new Promise<OpenStudioProject[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result || [];
          const filtered = all.filter((p: OpenStudioProject) => p.workspaceId === workspaceId);
          resolve(filtered);
        };
        request.onerror = () => reject(request.error);
      });
    });

    console.log(`[OpenStudio] found ${projects.length} projects`);
    return projects;
  }

  async createProject(project: Omit<OpenStudioProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<OpenStudioProject> {
    console.log('[OpenStudio] createProject');
    
    const newProject: OpenStudioProject = {
      ...project,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.withStore(STORES.PROJECTS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(newProject);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return newProject;
  }

  async deleteProject(projectId: string): Promise<void> {
    console.log(`[OpenStudio] deleteProject ${projectId}`);

    await this.withStore(STORES.PROJECTS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(projectId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get single project by ID
  async getProject(projectId: string): Promise<OpenStudioProject | null> {
    console.log(`[OpenStudio] getProject ${projectId}`);
    
    const project = await this.withStore(STORES.PROJECTS, 'readonly', (store) => {
      return new Promise<OpenStudioProject | undefined>((resolve, reject) => {
        const request = store.get(projectId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return project || null;
  }

  // Get single template by ID
  async getTemplate(templateId: string): Promise<OpenStudioTemplate | null> {
    console.log(`[OpenStudio] getTemplate ${templateId}`);
    
    const template = await this.withStore(STORES.TEMPLATES, 'readonly', (store) => {
      return new Promise<OpenStudioTemplate | undefined>((resolve, reject) => {
        const request = store.get(templateId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return template || null;
  }

  // Generation Jobs (for tracking batch generation)
  async createGenerationJob(job: { projectId: string; status: string; total: number; createdAt: number }): Promise<string> {
    const jobId = generateId();
    
    await this.withStore('generation_jobs', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add({ id: jobId, ...job });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    
    return jobId;
  }

  async updateGenerationJob(jobId: string, updates: Partial<{ status: string; completed: number; failed: number; completedAt: number }>): Promise<void> {
    await this.withStore('generation_jobs', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.get(jobId);
        request.onsuccess = () => {
          const job = request.result;
          if (job) {
            store.put({ ...job, ...updates });
            resolve();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Templates
  async getTemplates(projectId: string): Promise<OpenStudioTemplate[]> {
    return this.withStore(STORES.TEMPLATES, 'readonly', (store) => {
      return new Promise<OpenStudioTemplate[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = (request.result || []) as OpenStudioTemplate[];
          resolve(all.filter(t => t.projectId === projectId));
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async createTemplate(template: Omit<OpenStudioTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<OpenStudioTemplate> {
    const newTemplate: OpenStudioTemplate = {
      ...template,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.withStore(STORES.TEMPLATES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(newTemplate);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return newTemplate;
  }

  // Recipients
  async getRecipients(projectId: string): Promise<OpenStudioRecipient[]> {
    return this.withStore(STORES.RECIPIENTS, 'readonly', (store) => {
      return new Promise<OpenStudioRecipient[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = (request.result || []) as OpenStudioRecipient[];
          resolve(all.filter(r => r.projectId === projectId));
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async createRecipient(recipient: Omit<OpenStudioRecipient, 'id' | 'createdAt'>): Promise<OpenStudioRecipient> {
    const newRecipient: OpenStudioRecipient = {
      ...recipient,
      id: generateId(),
      createdAt: Date.now(),
    };

    await this.withStore(STORES.RECIPIENTS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(newRecipient);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return newRecipient;
  }

  async bulkCreateRecipients(recipients: Omit<OpenStudioRecipient, 'id' | 'createdAt'>[]): Promise<OpenStudioRecipient[]> {
    const created = [];
    for (const recipient of recipients) {
      created.push(await this.createRecipient(recipient));
    }
    return created;
  }

  // Certificates
  async getCertificates(projectId: string): Promise<OpenStudioCertificate[]> {
    return this.withStore(STORES.CERTIFICATES, 'readonly', (store) => {
      return new Promise<OpenStudioCertificate[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = (request.result || []) as OpenStudioCertificate[];
          resolve(all.filter(c => c.projectId === projectId));
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async createCertificate(certificate: Omit<OpenStudioCertificate, 'id' | 'generatedAt'>): Promise<OpenStudioCertificate> {
    const newCertificate: OpenStudioCertificate = {
      ...certificate,
      id: generateId(),
      generatedAt: Date.now(),
    };

    await this.withStore(STORES.CERTIFICATES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.add(newCertificate);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return newCertificate;
  }
}

export const openStudioDB = new OpenStudioDB();
export default openStudioDB;
