"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

interface Template {
  id: string;
  name: string;
  description: string | null;
  status: string;
  format: string;
  createdAt: string;
  projectId: string;
}

interface TemplateVersion {
  id: string;
  version: number;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  orientation: string;
  elements: string;
  createdAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchTemplates();
    }
  }, [projectId]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/templates`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!templateName.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/projects/${projectId}/templates/${data.template.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create template");
      }
    } catch (error) {
      alert("Network error");
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
      {/* Top nav */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="btn btn-ghost btn-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <div className="h-6 w-px" style={{ background: "hsl(var(--border))" }} />
            <span className="font-semibold">Templates</span>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="btn btn-primary btn-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New template
          </button>
        </div>
      </header>

      {/* New template form */}
      {showNewForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="container mx-auto px-6 py-6"
        >
          <div className="max-w-md p-6 rounded-xl border bg-card" style={{ borderColor: "hsl(var(--border))" }}>
            <h3 className="font-semibold mb-4">Create new template</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Template name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="AI Automation Masterclass Certificate"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTemplate()}
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="This certificate is awarded for completion of..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewForm(false)} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
                <button onClick={createTemplate} className="btn btn-primary btn-sm">
                  Create template
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Templates list */}
      <main className="container mx-auto px-6 py-6">
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
              Create your first certificate template to start designing.
            </p>
            <button onClick={() => setShowNewForm(true)} className="btn btn-primary btn-lg">
              Create template
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template, i) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="template-card"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/projects/${projectId}/templates/${template.id}`)}
              >
                <div
                  className="template-preview"
                  style={{
                    background: template.status === "PUBLISHED" ? "#1a1a2e" : "#e5e7eb",
                    color: template.status === "PUBLISHED" ? "white" : "hsl(var(--muted-foreground) / 0.3)",
                  }}
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
      </main>
    </div>
  );
}
