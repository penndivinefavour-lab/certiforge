// Minimal Open Studio Projects Page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DB_NAME = 'certiforge-studio';

export default function StudioProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  // Load projects from IndexedDB
  useEffect(() => {
    console.log('[Studio] Loading...');
    
    if (typeof indexedDB === 'undefined') {
      setError('IndexedDB not supported');
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (loading) {
        setError('Timeout - please refresh');
        setLoading(false);
      }
    }, 3000);

    const load = () => {
      try {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('projects')) {
            db.createObjectStore('projects', { keyPath: 'id' });
          }
        };

        request.onsuccess = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          
          const tx = db.transaction('projects', 'readonly');
          const store = tx.objectStore('projects');
          const getAll = store.getAll();

          getAll.onsuccess = () => {
            console.log('[Studio] Loaded:', getAll.result?.length || 0, 'projects');
            setProjects(getAll.result || []);
            setLoading(false);
            db.close();
          };

          getAll.onerror = () => {
            setError('Failed to load projects');
            setLoading(false);
            db.close();
          };
        };

        request.onerror = () => {
          setError('Failed to open database');
          setLoading(false);
        };
      } catch (err) {
        console.error('[Studio] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setLoading(false);
      }
    };

    load();

    return () => clearTimeout(timeout);
  }, [loading]);

  const createProject = async () => {
    if (!name.trim()) return;

    setCreating(true);
    
    try {
      if (typeof indexedDB === 'undefined') return;

      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        
        const tx = db.transaction('projects', 'readwrite');
        const store = tx.objectStore('projects');
        
        const newProject = {
          id: crypto.randomUUID(),
          name: name.trim(),
          description: '',
          state: 'DRAFT',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const addRequest = store.add(newProject);

        addRequest.onsuccess = () => {
          console.log('[Studio] Created project:', newProject.id);
          setShowModal(false);
          setName('');
          router.push(`/studio/projects/${newProject.id}`);
          db.close();
        };

        addRequest.onerror = () => {
          setError('Failed to create project');
          db.close();
        };
      };

      request.onerror = () => {
        setError('Failed to open database');
        console.error('[Studio] Database error:', request.error);
      };
    } catch (err) {
      console.error('[Studio] Create error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;

    try {
      if (typeof indexedDB === 'undefined') return;

      const request = indexedDB.open(DB_NAME, 1);

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        
        const tx = db.transaction('projects', 'readwrite');
        const store = tx.objectStore('projects');
        const deleteRequest = store.delete(id);

        deleteRequest.onsuccess = () => {
          setProjects(prev => prev.filter(p => p.id !== id));
          console.log('[Studio] Deleted project:', id);
          db.close();
        };

        deleteRequest.onerror = () => {
          setError('Failed to delete project');
          db.close();
        };
      };

      request.onerror = () => {
        setError('Database error');
      };
    } catch (err) {
      console.error('[Studio] Delete error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="border-b border-[hsl(var(--border))]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/studio" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              ← Back
            </Link>
            <h1 className="text-xl font-semibold mt-1">My Projects</h1>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            + New Project
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📁</div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">Create your first project to start designing certificates</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="card card-interactive">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium">{project.name}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
                <Link
                  href={`/studio/projects/${project.id}`}
                  className="block w-full py-2 rounded text-center text-sm btn btn-secondary"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">New Project</h2>
              <input
                type="text"
                placeholder="Project name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createProject()}
              />
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button 
                  onClick={createProject} 
                  disabled={creating || !name.trim()}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
