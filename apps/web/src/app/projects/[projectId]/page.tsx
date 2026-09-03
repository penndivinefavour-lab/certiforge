"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

interface Project {
  id: string;
  name: string;
  slug: string;
  state: string;
  description: string | null;
  stats: {
    certificates: number;
    recipients: number;
    templates: number;
  };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  status: string;
  format: string;
  createdAt: string;
}

interface TemplateVersion {
  id: string;
  version: number;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  orientation: string;
  createdAt: string;
}

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (path: string) => router.push(path);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="btn btn-ghost btn-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <div className="h-6 w-px" style={{ background: "hsl(var(--border))" }} />
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
              <span className="font-semibold">{project.name}</span>
              <span className={`badge ${project.state === "DRAFT" ? "status-draft" : project.state === "ACTIVE" ? "status-issued" : "status-revoked"}`}>
                {project.state}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(`/projects/${projectId}/templates`)}
              className="btn btn-secondary btn-sm"
            >
              Manage templates
            </button>
            <button
              onClick={() => navigateTo(`/projects/${projectId}/import`)}
              className="btn btn-primary btn-sm"
            >
              Import recipients
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-8">
          {/* Project overview */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <div className="p-6 rounded-xl border" style={{ borderColor: "hsl(var(--border))" }}>
              {project.description ? (
                <p className="text-muted-foreground">{project.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
            </div>
          </section>

          {/* Quick stats */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Statistics</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border text-center" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-2xl font-bold">{project.stats.certificates}</p>
                <p className="text-sm text-muted-foreground">Certificates</p>
              </div>
              <div className="p-4 rounded-lg border text-center" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-2xl font-bold">{project.stats.recipients}</p>
                <p className="text-sm text-muted-foreground">Recipients</p>
              </div>
              <div className="p-4 rounded-lg border text-center" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-2xl font-bold">{project.stats.templates}</p>
                <p className="text-sm text-muted-foreground">Templates</p>
              </div>
            </div>
          </section>

          {/* Templates */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Templates</h2>
              <button
                onClick={() => navigateTo(`/projects/${projectId}/templates/new`)}
                className="btn btn-primary btn-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New template
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="p-8 rounded-xl border text-center" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-muted-foreground mb-4">No templates yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a template to start designing your certificates.
                </p>
                <button
                  onClick={() => navigateTo(`/projects/${projectId}/templates/new`)}
                  className="btn btn-secondary btn-sm"
                >
                  Create template
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="template-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigateTo(`/projects/${projectId}/templates/${template.id}`)}
                  >
                    <div
                      className="template-preview"
                      style={{ background: template.status === "PUBLISHED" ? "#1a1a2e" : "#f0f0f0", color: template.status === "PUBLISHED" ? "white" : "hsl(var(--muted-foreground) / 0.3)" }}
                    >
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="9" y1="21" x2="9" y2="9"/>
                      </svg>
                    </div>
                    <h4 className="template-name">{template.name}</h4>
                    {template.description && (
                      <p className="template-description">{template.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`badge ${template.status === "PUBLISHED" ? "badge-success" : "badge"}`}>
                        {template.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{template.format}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Action buttons */}
          <section className="flex gap-4">
            <button
              onClick={() => navigateTo(`/projects/${projectId}/import`)}
              className="btn btn-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Import recipients
            </button>
            <button
              onClick={() => navigateTo(`/projects/${projectId}/generate`)}
              className="btn btn-secondary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Generate certificates
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
