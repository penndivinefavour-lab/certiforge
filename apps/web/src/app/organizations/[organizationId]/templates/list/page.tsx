"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function OrganizationTemplatesPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;

  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    format: string;
    createdAt: string;
    version: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchTemplates();
    }
  }, [organizationId]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/templates`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header flex items-center justify-between">
          <div className="sidebar-logo flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
              <path d="M2 17L12 22L22 17"/>
              <path d="M2 12L12 17L22 12"/>
            </svg>
            <span>Certi<span>Forge</span></span>
          </div>
          <button
            onClick={() => router.push(`/organizations/${organizationId}`)}
            className="btn btn-ghost btn-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => router.push(`/organizations/${organizationId}`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"/>
              <rect x="14" y="3" width="7" height="5"/>
              <rect x="14" y="12" width="7" height="9"/>
              <rect x="3" y="16" width="7" height="5"/>
            </svg>
            Back to organization
          </button>
          <button className="sidebar-item active">
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Templates
          </button>
        </nav>
      </aside>

      {/* Content */}
      <main className="dashboard-content">
        <div className="dashboard-header flex items-center justify-between">
          <div>
            <h1 className="dashboard-header-title">Templates</h1>
            <p className="dashboard-header-subtitle">Manage certificate designs</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/organizations/${organizationId}/templates/library`)}
              className="btn btn-secondary btn-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              Library
            </button>
            <button
              onClick={() => router.push(`/organizations/${organizationId}/templates/create`)}
              className="btn btn-primary btn-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New template
            </button>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="empty-state max-w-md">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <p className="empty-state-title">No templates yet</p>
            <p className="empty-state-description">
              Create your first certificate template or choose from the library.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => router.push(`/organizations/${organizationId}/templates/library`)}
                className="btn btn-secondary"
              >
                Browse library
              </button>
              <button
                onClick={() => router.push(`/organizations/${organizationId}/templates/create`)}
                className="btn btn-primary"
              >
                Create blank
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="template-card"
                onClick={() => router.push(`/organizations/${organizationId}/templates/${template.id}/edit`)}
                style={{ cursor: "pointer" }}
              >
                <div
                  className="template-preview"
                  style={{
                    background: template.status === "PUBLISHED" ? "#1a1a2e" : "#e5e7eb",
                    color: template.status === "PUBLISHED" ? "white" : "hsl(var(--muted-foreground) / 0.3)",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
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
                    {template.status} • v{template.version}
                  </span>
                  <span className="text-xs text-muted-foreground">{template.format}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
