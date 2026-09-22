// Client-side IndexedDB service for Open Studio
// All CRUD operations run in the browser — no API calls needed
/// <reference lib="dom" />

const DB_NAME = 'certiforge-studio';
const DB_VERSION = 2;

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  state: string;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  backgroundColor: string;
  elements: any[];
  canvasState?: any;
  createdAt: number;
  updatedAt: number;
}

export interface Recipient {
  id: string;
  projectId: string;
  name: string;
  email: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

export interface Certificate {
  id: string;
  projectId: string;
  certificateNumber: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  templateId: string;
  verificationToken?: string;
  status: string;
  pdfData?: string;
  qrCodeUrl?: string;
  generatedAt: number;
}

class StudioService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async openDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise as Promise<IDBDatabase>;

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        this.initPromise = null;
        reject(new Error('IndexedDB not available'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Version 1 stores already created by previous version
        // Add indexes for version 2
        const projects = db.objectStoreNames.contains('projects') ? db.transaction('projects', 'readwrite').objectStore('projects') : null;
        if (projects && !projects.indexNames.contains('byWorkspaceId')) {
          try { projects.createIndex('byWorkspaceId', 'workspaceId'); } catch {}
        }
        const templates = db.objectStoreNames.contains('templates') ? db.transaction('templates', 'readwrite').objectStore('templates') : null;
        if (templates && !templates.indexNames.contains('byProjectId')) {
          try { templates.createIndex('byProjectId', 'projectId'); } catch {}
        }
        const recipients = db.objectStoreNames.contains('recipients') ? db.transaction('recipients', 'readwrite').objectStore('recipients') : null;
        if (recipients && !recipients.indexNames.contains('byProjectId')) {
          try { recipients.createIndex('byProjectId', 'projectId'); } catch {}
        }
        const certificates = db.objectStoreNames.contains('certificates') ? db.transaction('certificates', 'readwrite').objectStore('certificates') : null;
        if (certificates && !certificates.indexNames.contains('byProjectId')) {
          try { certificates.createIndex('byProjectId', 'projectId'); } catch {}
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve(this.db);
      };
      request.onerror = () => {
        this.initPromise = null;
        reject(request.error || new Error('Failed to open database'));
      };
    });

    await this.initPromise;
    return this.db!;
  }

  private async withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.openDb();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction([storeName], mode);
      transaction.onerror = () => reject(transaction.error || new Error('Transaction failed'));
      transaction.onabort = () => reject(new Error('Transaction aborted'));
      transaction.oncomplete = () => {};
      const store = transaction.objectStore(storeName);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  // ── Projects ───────────────────────────────────────────
  async getProjects(workspaceId: string): Promise<Project[]> {
    const all = await this.withStore<Project[]>('projects', 'readonly', (store) => store.getAll());
    return all.filter(p => p.workspaceId === workspaceId);
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const newProject: Project = { ...project, id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() };
    await this.withStore('projects', 'readwrite', (store) => store.add(newProject));
    return newProject;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.withStore('projects', 'readwrite', (store) => store.delete(projectId));
  }

  async getProject(projectId: string): Promise<Project | undefined> {
    return this.withStore<Project | undefined>('projects', 'readonly', (store) => store.get(projectId));
  }

  // ── Templates ───────────────────────────────────────────
  async getTemplates(projectId: string): Promise<Template[]> {
    return this.withStore<Template[]>('templates', 'readonly', (store) => {
      const req = store.getAll();
      req.onsuccess = () => {
        (req.result as Template[]).filter(t => t.projectId === projectId);
      };
      return req;
    }).then(all => all.filter(t => t.projectId === projectId));
  }

  async createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    const newTemplate: Template = {
      ...template,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.withStore('templates', 'readwrite', (store) => store.add(newTemplate));
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    return this.withStore<Template>('templates', 'readwrite', (store) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const existing = req.result;
        if (existing) {
          store.put({ ...existing, ...updates, updatedAt: Date.now() });
        }
      };
      return req;
    });
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.withStore('templates', 'readwrite', (store) => store.delete(templateId));
  }

  // ── Recipients ──────────────────────────────────────────
  async getRecipients(projectId: string): Promise<Recipient[]> {
    return this.withStore<Recipient[]>('recipients', 'readonly', (store) => {
      const req = store.getAll();
      return req;
    }).then(all => all.filter(r => r.projectId === projectId));
  }

  async createRecipient(recipient: Omit<Recipient, 'id' | 'createdAt'>): Promise<Recipient> {
    const newRecipient: Recipient = {
      ...recipient,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    await this.withStore('recipients', 'readwrite', (store) => store.add(newRecipient));
    return newRecipient;
  }

  async bulkCreateRecipients(recipients: Omit<Recipient, 'id' | 'createdAt'>[]): Promise<Recipient[]> {
    const results: Recipient[] = [];
    for (const r of recipients) {
      results.push(await this.createRecipient(r));
    }
    return results;
  }

  async deleteRecipients(projectId: string): Promise<void> {
    const recs = await this.getRecipients(projectId);
    await Promise.all(recs.map(r => this.withStore('recipients', 'readwrite', (store) => store.delete(r.id))));
  }

  // ── Certificates ────────────────────────────────────────
  async getCertificates(projectId: string): Promise<Certificate[]> {
    return this.withStore<Certificate[]>('certificates', 'readonly', (store) => store.getAll()).then(all => all.filter(c => c.projectId === projectId));
  }

  async createCertificate(cert: Omit<Certificate, 'id' | 'generatedAt'>): Promise<Certificate> {
    const newCert: Certificate = {
      ...cert,
      id: crypto.randomUUID(),
      generatedAt: Date.now(),
    };
    await this.withStore('certificates', 'readwrite', (store) => store.add(newCert));
    return newCert;
  }

  async deleteCertificates(projectId: string): Promise<void> {
    const certs = await this.getCertificates(projectId);
    await Promise.all(certs.map(c => this.withStore('certificates', 'readwrite', (store) => store.delete(c.id))));
  }
}

export const studioService = new StudioService();
