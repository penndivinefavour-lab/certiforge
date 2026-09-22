// Minimal Project Detail Page - Direct IndexedDB
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const DB_NAME = 'certiforge-studio';
const PROJECTS_STORE = 'projects';

interface Project {
  id: string;
  name: string;
  description?: string;
  state: string;
  createdAt: number;
  updatedAt: number;
  templates?: any[];
  recipients?: any[];
  certificates?: any[];
}

export default function StudioProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'recipients' | 'certificates'>('templates');

  useEffect(() => {
    console.log('[ProjectDetail] Loading project:', projectId);

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
    }, 5000);

    const loadProject = async () => {
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, 2);

          request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            // Ensure all stores exist
            ['projects', 'templates', 'recipients', 'certificates'].forEach(storeName => {
              if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
              }
            });
          };

          request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
          request.onerror = () => reject(request.error);
        });

        // Load project
        const tx = db.transaction(PROJECTS_STORE, 'readonly');
        const store = tx.objectStore(PROJECTS_STORE);
        const getRequest = store.get(projectId);

        getRequest.onsuccess = async () => {
          const data = getRequest.result;

          if (!data) {
            setError('Project not found');
            setLoading(false);
            db.close();
            return;
          }

          // Load related data from separate stores
          const templatesTx = db.transaction('templates', 'readonly');
          const templatesStore = templatesTx.objectStore('templates');
          const templatesReq = templatesStore.getAll();

          const recipientsTx = db.transaction('recipients', 'readonly');
          const recipientsStore = recipientsTx.objectStore('recipients');
          const recipientsReq = recipientsStore.getAll();

          const certificatesTx = db.transaction('certificates', 'readonly');
          const certificatesStore = certificatesTx.objectStore('certificates');
          const certificatesReq = certificatesStore.getAll();

          await Promise.all([
            new Promise<void>((resolve) => {
              templatesReq.onsuccess = () => {
                (data as any).templates = (templatesReq.result || []).filter((t: any) => t.projectId === projectId);
                resolve();
              };
              templatesReq.onerror = () => {
                (data as any).templates = [];
                resolve();
              };
            }),
            new Promise<void>((resolve) => {
              recipientsReq.onsuccess = () => {
                (data as any).recipients = (recipientsReq.result || []).filter((r: any) => r.projectId === projectId);
                resolve();
              };
              recipientsReq.onerror = () => {
                (data as any).recipients = [];
                resolve();
              };
            }),
            new Promise<void>((resolve) => {
              certificatesReq.onsuccess = () => {
                (data as any).certificates = (certificatesReq.result || []).filter((c: any) => c.projectId === projectId);
                resolve();
              };
              certificatesReq.onerror = () => {
                (data as any).certificates = [];
                resolve();
              };
            }),
          ]);

          console.log('[ProjectDetail] Found project:', (data as any).name || 'not found');
          setProject(data as Project);
          setLoading(false);
          db.close();
        };

        getRequest.onerror = () => {
          setError('Failed to load project');
          setLoading(false);
          db.close();
        };
      } catch (err) {
        console.error('[ProjectDetail] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setLoading(false);
      }
    };

    loadProject();

    return () => clearTimeout(timeout);
  }, [projectId]);

  const deleteProject = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    try {
      if (typeof indexedDB === 'undefined') return;

      const request = indexedDB.open(DB_NAME, 1);

      request.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        
        const tx = db.transaction(PROJECTS_STORE, 'readwrite');
        const store = tx.objectStore(PROJECTS_STORE);
        const deleteRequest = store.delete(projectId);

        deleteRequest.onsuccess = () => {
          console.log('[ProjectDetail] Deleted project:', projectId);
          router.push('/studio/projects');
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
      console.error('[ProjectDetail] Delete error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Link href="/studio/projects" className="btn btn-primary">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">📁</div>
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-6">The project may have been deleted or the database cleared.</p>
          <Link href="/studio/projects" className="btn btn-primary">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/studio/projects" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold mt-1">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <button
                onClick={deleteProject}
                className="text-xs text-destructive hover:underline"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'templates', label: 'Templates', icon: '📄' },
              { id: 'recipients', label: 'Recipients', icon: '👥' },
              { id: 'certificates', label: 'Certificates', icon: '🎓' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="px-4 py-3 font-medium text-sm transition-all border-b-2"
                style={{
                  borderColor: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--muted-foreground)',
                }}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.id === 'templates' && project.templates && (
                  <span className="ml-2 text-xs opacity-60">({project.templates.length})</span>
                )}
                {tab.id === 'recipients' && project.recipients && (
                  <span className="ml-2 text-xs opacity-60">({project.recipients.length})</span>
                )}
                {tab.id === 'certificates' && project.certificates && (
                  <span className="ml-2 text-xs opacity-60">({project.certificates.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'templates' && (
          <TemplatesTab project={project} />
        )}
        {activeTab === 'recipients' && (
          <RecipientsTab project={project} />
        )}
        {activeTab === 'certificates' && (
          <CertificatesTab project={project} />
        )}
      </main>
    </div>
  );
}

function TemplatesTab({ project }: { project: Project }) {
  const router = useRouter();
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Templates</h2>
        <button
          onClick={() => router.push(`/studio/projects/${project.id}/editor`)}
          className="px-4 py-2 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:opacity-90"
        >
          + New Template
        </button>
      </div>
      
      {project.templates && project.templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.templates.map((template) => (
            <div key={template.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium">{template.name}</h3>
              </div>
              <div className="text-xs text-muted-foreground mb-4">
                {template.createdAt && new Date(template.createdAt).toLocaleDateString()}
              </div>
              <button
                onClick={() => router.push(`/studio/projects/${project.id}/editor`)}
                className="block w-full py-2 rounded text-center text-sm btn-secondary"
              >
                Edit Template
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-6">Create your first template to start designing certificates</p>
          <button
            onClick={() => router.push(`/studio/projects/${project.id}/editor`)}
            className="btn btn-primary"
          >
            Create Template
          </button>
        </div>
      )}
    </div>
  );
}

function RecipientsTab({ project }: { project: Project }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Recipients</h2>
        <button className="btn btn-primary">
          + Import CSV
        </button>
      </div>
      
      {project.recipients && project.recipients.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Course</th>
              </tr>
            </thead>
            <tbody>
              {project.recipients.map((recipient, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3">{recipient.name}</td>
                  <td className="py-2 px-3">{recipient.email}</td>
                  <td className="py-2 px-3">{recipient.course || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">No recipients yet</h3>
          <p className="text-muted-foreground mb-6">Import a CSV file to add recipients</p>
          <button className="btn btn-primary">
            Import CSV
          </button>
        </div>
      )}
    </div>
  );
}

function CertificatesTab({ project }: { project: Project }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Certificates</h2>
        <button className="btn btn-primary">
          Generate Certificates
        </button>
      </div>
      
      {project.certificates && project.certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.certificates.map((cert) => (
            <div key={cert.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-sm">{cert.recipientName || cert.id}</h3>
              </div>
              <div className="text-xs text-muted-foreground mb-4">
                {cert.certificateNumber && (
                  <span className="font-mono">{cert.certificateNumber}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded text-center text-xs btn-secondary">
                  Download PDF
                </button>
                <Link
                  href={`/verify/${cert.certificateNumber}`}
                  className="px-3 py-2 rounded text-xs btn-secondary"
                >
                  Verify
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎓</div>
          <h3 className="text-lg font-semibold mb-2">No certificates generated</h3>
          <p className="text-muted-foreground mb-6">Add recipients and generate certificates</p>
          <button className="btn btn-primary">
            Generate Certificates
          </button>
        </div>
      )}
    </div>
  );
}
