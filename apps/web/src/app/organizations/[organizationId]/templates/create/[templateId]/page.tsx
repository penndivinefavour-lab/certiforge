"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CreateTemplateFromLibraryPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;
  const templateId = params.templateId as string;

  const [templateName, setTemplateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Get template info from URL parameter
  const TEMPLATE_INFO: Record<string, { name: string; description: string; orientation: string; color: string }> = {
    "course-completion": {
      name: "Course Completion",
      description: "Traditional academic certificate with ornate border",
      orientation: "landscape",
      color: "#1a1a2e",
    },
    "participation": {
      name: "Participation",
      description: "Simple, clean certificate for event participation",
      orientation: "portrait",
      color: "#2d5016",
    },
    "achievement": {
      name: "Achievement",
      description: "Award-style certificate with medal accent",
      orientation: "landscape",
      color: "#b8860b",
    },
    "excellence": {
      name: "Excellence",
      description: "Premium certificate for outstanding performance",
      orientation: "landscape",
      color: "#8b0000",
    },
    "workshop": {
      name: "Workshop",
      description: "Compact certificate for short workshops",
      orientation: "portrait",
      color: "#4a5568",
    },
    "training": {
      name: "Training",
      description: "Professional training completion certificate",
      orientation: "landscape",
      color: "#2c3e50",
    },
    "internship": {
      name: "Internship",
      description: "Modern certificate for internship completion",
      orientation: "portrait",
      color: "#3498db",
    },
    "appreciation": {
      name: "Appreciation",
      description: "Warm certificate to show appreciation",
      orientation: "portrait",
      color: "#e67e22",
    },
    "academic": {
      name: "Academic",
      description: "Formal academic certificate with seal",
      orientation: "landscape",
      color: "#1b4332",
    },
    "corporate": {
      name: "Corporate",
      description: "Professional corporate certificate",
      orientation: "landscape",
      color: "#0f172a",
    },
  };

  const templateInfo = TEMPLATE_INFO[templateId];

  const handleCreate = async () => {
    if (!templateName.trim() || !organizationId) return;

    setIsCreating(true);
    try {
      // Create the template
      const res = await fetch(`/api/organizations/${organizationId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateInfo?.description,
          format: "PDF",
          orientation: templateInfo?.orientation || "landscape",
          backgroundColor: templateInfo?.color,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/organizations/${organizationId}/templates/${data.template.id}/edit`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create template");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setIsCreating(false);
    }
  };

  if (!templateInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Template not found</p>
          <button className="btn btn-primary" onClick={() => router.back()}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="p-6 rounded-xl border shadow-lg" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: templateInfo.color }}
            >
              {templateInfo.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold">Create from template</h1>
              <p className="text-muted-foreground text-sm">{templateInfo.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Template name</label>
              <input
                type="text"
                className="form-input"
                placeholder={`${templateInfo.name} Certificate`}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
              <p className="form-hint">Give your template a descriptive name.</p>
            </div>

            <div className="p-4 rounded-lg border bg-muted/30" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="flex items-center gap-3 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                <span className="text-muted-foreground">
                  {templateInfo.orientation === "landscape" ? "Landscape" : "Portrait"} orientation
                </span>
              </div>
            </div>

            <div className="form-actions">
              <button
                onClick={() => router.back()}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!templateName.trim() || isCreating}
                className="btn btn-primary btn-sm"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating...
                  </>
                ) : (
                  "Create template"
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
