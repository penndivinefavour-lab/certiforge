// Open Studio Projects Page - Client-side only with robust initialization
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description?: string;
  state: string;
  createdAt: number;
  updatedAt: number;
}

// Safety timeout - if initialization takes > 3s, show error
const INIT_TIMEOUT_MS = 3000;

export default function StudioProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initTime, setInitTime] = useState<number | null>(null);
  
  // Use ref to prevent stale closures and track initialization state
  const isMounted = useRef(true);
  const initStartedAt = useRef<number>(Date.now());
  const dbRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize IndexedDB on mount - with timeout safety
  useEffect(() => {
    initStartedAt.current = Date.now();
    console.log('[CertiForge][Studio] mount - starting initialization');
    
    let timeoutId: number | undefined;
    let cancelled = false;

    const initWithTimeout = async () => {
      try {
        // Set timeout to prevent infinite loading
        timeoutId = window.setTimeout(() => {
          if (!cancelled && isMounted.current) {
            console.error('[CertiForge][Studio][ERROR] Initialization timeout - showing error state');
            setError('Initialization timed out. Please refresh the page.');
            setLoading(false);
            setDbReady(false);
          }
        }, INIT_TIMEOUT_MS);

        // Dynamic import of Open Studio
        console.log('[CertiForge][Studio] loading open-studio package');
        const module = await import('@certiforge/open-studio');
        console.log('[CertiForge][Studio] open-studio package loaded');

        // Verify the module has what we need
        if (!module.default && !module.openStudioDB) {
          throw new Error('Open Studio module missing required exports');
        }

        const { openStudioDB } = module;
        dbRef.current = openStudioDB;
        (window as any).__openStudioDB = openStudioDB;

        console.log('[CertiForge][Studio] IndexedDB init START');
        initStartedAt.current = Date.now();
        await openStudioDB.init();
        console.log('[CertiForge][Studio] IndexedDB init END');

        if (!cancelled && isMounted.current) {
          setDbReady(true);
          const initDuration = Date.now() - initStartedAt.current;
          setInitTime(initDuration);
          console.log(`[CertiForge][Studio] Database ready in ${initDuration}ms`);
          
          // Load projects after DB is ready
          await loadProjects();
        }
      } catch (err) {
        console.error('[CertiForge][Studio][ERROR]', err);
        if (!cancelled && isMounted.current) {
          setError(`Failed to initialize: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        if (!cancelled && isMounted.current) {
          // Always stop loading - either success, empty state, or error
          setLoading(false);
        }
      }
    };

    initWithTimeout();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  // Load projects from IndexedDB
  const loadProjects = useCallback(async () => {
    if (!dbRef.current || !isMounted.current) return;

    try {
      console.log('[CertiForge][Studio] projects load START');
      const startTime = Date.now();
      
      const workspace = await dbRef.current.getOrCreateWorkspace();
      console.log(`[CertiForge][Studio] workspace loaded: ${workspace.id}`);
      
      const projList = await dbRef.current.getProjects(workspace.id);
      console.log(`[CertiForge][Studio] projects loaded: ${projList.length} projects`);
      
      if (isMounted.current) {
        setProjects(projList.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          state: p.state,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })));
        const duration = Date.now() - startTime;
        console.log(`[CertiForge][Studio] projects load END (${duration}ms)`);
      }
    } catch (err) {
      console.error('[CertiForge][Studio][ERROR] Failed to load projects:', err);
      if (isMounted.current) {
        setError('Failed to load projects from local storage.');
      }
    }
  }, []);

  // Create a new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setSaving(true);
    try {
      if (!dbRef.current) {
        setError('Database not initialized. Please refresh the page.');
        return;
      }

      console.log('[CertiForge][Studio] createProject START');
      const startTime = Date.now();
      
      const workspace = await dbRef.current.getOrCreateWorkspace();
      const project = await dbRef.current.createProject({
        workspaceId: workspace.id,
        name: newProjectName,
        description: newProjectDescription || undefined,
        state: 'DRAFT',
      });

      console.log(`[CertiForge][Studio] createProject END (${Date.now() - startTime}ms)`);

      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');

      // Navigate to the new project
      router.push(`/studio/projects/${project.id}`);
    } catch (err) {
      console.error('[CertiForge][Studio][ERROR] Failed to create project:', err);
      setError('Failed to create project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete a project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      if (!dbRef.current) return;

      console.log('[CertiForge][Studio] deleteProject START');
      await dbRef.current.deleteProject(projectId);
      console.log('[CertiForge][Studio] deleteProject END');
      
      // Refresh the project list
      await loadProjects();
    } catch (err) {
      console.error('[CertiForge][Studio][ERROR] Failed to delete project:', err);
    }
  };

  // Loading state - with timeout safety already built in
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
          Loading workspace...
        </p>
      </div>
    );
  }

  // Error state - user can retry
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">
          Unable to Load Workspace
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-md text-center">
          {error}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Refresh Page
          </button>
          <Link href="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Database not ready (shouldn't normally reach here due to timeout handling)
  if (!dbReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">
          Storage Unavailable
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-md text-center">
          IndexedDB is not available in your browser. Open Studio requires a modern browser with local storage support.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
          <Link href="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Success states
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <Link href="/studio" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
              ← Back to Studio
            </Link>
            <h1 className="text-2xl font-bold mt-1 text-[hsl(var(--foreground))]">
              My Projects
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Data stored locally in your browser
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <h2 className="empty-state-title">No projects yet</h2>
            <p className="empty-state-description">
              Create your first project to start generating professional certificates
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary mt-6"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="card card-interactive group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[hsl(var(--foreground))]">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="ml-4 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                      style={{ color: 'hsl(var(--destructive))' }}
                      title="Delete project"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] mb-4">
                    <span className="badge badge-success">{project.state.toLowerCase()}</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <Link
                    href={`/studio/projects/${project.id}`}
                    className="block w-full py-2 rounded-lg text-center text-sm font-medium btn btn-secondary"
                  >
                    Open Project
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="card w-full max-w-md">
                <h2 className="text-xl font-semibold mb-6 text-[hsl(var(--foreground))]">
                  Create New Project
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g., Community Training 2026"
                      className="form-input"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Description (optional)
                    </label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Brief description of this project..."
                      rows={3}
                      className="form-input resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={saving || !newProjectName.trim()}
                    className="btn btn-primary flex-1 disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
