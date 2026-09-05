'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description?: string;
  state: string;
  templates: any[];
  recipientCount: number;
  certificateCount: number;
}

export default function StudioProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'recipients' | 'certificates'>('templates');

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/studio/projects/${projectId}`);
      const data = await res.json();
      if (data.project) {
        setProject(data.project);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2" style={{ color: 'var(--destructive)' }}>
            Project not found
          </p>
          <Link href="/studio/projects" className="text-primary hover:underline">
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/studio/projects" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to projects
              </Link>
              <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
                {project.name}
              </h1>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Saved locally
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [project.id]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/templates`);
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Templates
        </h2>
        <button
          onClick={() => router.push(`/studio/projects/${project.id}/editor`)}
          className="px-4 py-2 rounded-lg font-medium text-sm"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
        >
          + New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            No templates yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Upload a certificate template or create one from scratch
          </p>
          <button
            onClick={() => router.push(`/studio/projects/${project.id}/editor`)}
            className="px-6 py-2 rounded-lg font-medium"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border p-4 hover:shadow-md transition-shadow"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                <span className="text-4xl">📄</span>
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>
                {template.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {template.orientation} • {template.width}×{template.height}px
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => router.push(`/studio/projects/${project.id}/editor`)}
                  className="flex-1 py-1.5 rounded text-sm font-medium"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--accent-foreground)',
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipientsTab({ project }: { project: Project }) {
  const router = useRouter();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Recipients ({project.recipientCount})
        </h2>
        <button
          onClick={() => router.push(`/studio/projects/${project.id}/recipients`)}
          className="px-4 py-2 rounded-lg font-medium text-sm"
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
        >
          + Import Recipients
        </button>
      </div>
      
      {project.recipientCount === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            No recipients yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Import recipients from CSV or Excel file
          </p>
          <button
            onClick={() => router.push(`/studio/projects/${project.id}/recipients`)}
            className="px-6 py-2 rounded-lg font-medium"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Import Recipients
          </button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                  Showing {project.recipientCount} recipients
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CertificatesTab({ project }: { project: Project }) {
  const router = useRouter();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
          Certificates ({project.certificateCount})
        </h2>
        {project.certificateCount > 0 && (
          <button
            onClick={() => router.push(`/studio/projects/${project.id}/generate`)}
            className="px-4 py-2 rounded-lg font-medium text-sm"
            style={{
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            Generate New
          </button>
        )}
      </div>
      
      {project.certificateCount === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <div className="text-4xl mb-4">🎓</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            No certificates generated
          </h3>
          <p className="text-muted-foreground mb-4">
            Upload a template and import recipients to generate certificates
          </p>
          <button
            onClick={() => router.push(`/studio/projects/${project.id}/editor`)}
            className="px-6 py-2 rounded-lg font-medium"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
          >
            Get Started
          </button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--muted)' }}>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Certificate ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Issued</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Showing {project.certificateCount} certificates
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
