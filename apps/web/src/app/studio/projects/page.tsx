// Open Studio Projects Page - Premium UI
'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    initDb();
  }, []);

  async function initDb() {
    try {
      const module = await import('@certiforge/open-studio');
      const { openStudioDB } = module;
      (window as any).__openStudioDB = openStudioDB;
      await openStudioDB.init();
      setDbReady(true);
      await loadProjects();
    } catch (err) {
      console.error('Failed to initialize Open Studio DB:', err);
      setError('Failed to initialize local storage. Please ensure IndexedDB is available.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const db = (window as any).__openStudioDB;
      if (!db) return;
      
      const workspace = await db.getOrCreateWorkspace();
      const projList = await db.getProjects(workspace.id);
      
      setProjects(projList.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        state: p.state,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })) as Project[]);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects from local storage.');
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    
    setSaving(true);
    try {
      const db = (window as any).__openStudioDB;
      if (!db) {
        setError('Database not initialized. Please refresh the page.');
        return;
      }
      
      const workspace = await db.getOrCreateWorkspace();
      const project = await db.createProject({
        workspaceId: workspace.id,
        name: newProjectName,
        description: newProjectDescription || undefined,
        state: 'DRAFT',
      });
      
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      router.push(`/studio/projects/${project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('Failed to create project. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const db = (window as any).__openStudioDB;
      if (!db) return;
      
      await db.deleteProject(projectId);
      await loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

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
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[hsl(var(--muted-foreground))] text-sm">Loading workspace...</p>
          </div>
        ) : !dbReady ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">Storage Unavailable</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">IndexedDB is not available in your browser.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-secondary"
            >
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
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
