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
        console.log('[OpenStudio] creating stores');
        
        if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
          db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
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
}

export const openStudioDB = new OpenStudioDB();
export default openStudioDB;
