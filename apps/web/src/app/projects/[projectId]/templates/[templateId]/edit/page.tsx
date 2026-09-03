"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Editor component placeholder - in production this would use Fabric.js
export default function EditorPage() {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In production: save editor state to API
      await new Promise((r) => setTimeout(r, 500));
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = () => {
    router.push("/dashboard");
  };

  const handlePreview = () => {
    // Preview would show the certificate with sample data
    router.push(`/projects/${router.pathname.split("/")[2]}/preview`);
  };

  return (
    <div className="editor-shell">
      {/* Top toolbar */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="container mx-auto px-4 py-2 flex items-center justify-between bg-card" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <div className="h-6 w-px" style={{ background: "hsl(var(--border))" }} />
            <span className="font-semibold text-sm">Certificate Editor</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="btn btn-ghost btn-sm"
              title="Undo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              title="Redo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
            <div className="h-6 w-px" style={{ background: "hsl(var(--border))" }} />
            <button
              onClick={handlePreview}
              className="btn btn-ghost btn-sm"
              title="Preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className="btn btn-secondary btn-sm"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleGenerate}
              className="btn btn-primary btn-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Generate
            </button>
          </div>
        </div>
      </header>

      {/* Editor area */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left: Elements panel */}
        <aside className="elements-panel">
          <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Elements
            </h3>
            <div className="space-y-1">
              {[
                { type: "TEXT", icon: "T", color: "hsl(var(--primary))" },
                { type: "IMAGE", icon: "🖼", color: "hsl(140 60% 50%)" },
                { type: "SHAPE", icon: "■", color: "hsl(40 70% 50%)" },
                { type: "LINE", icon: "━", color: "hsl(220 70% 50%)" },
                { type: "QR_CODE", icon: "QR", color: "hsl(0 65% 50%)" },
              ].map((el) => (
                <div
                  key={el.type}
                  className="element-item"
                  style={{ opacity: 0.6, cursor: "default" }}
                >
                  <span
                    className="element-item-icon font-bold text-xs"
                    style={{ color: el.color }}
                  >
                    {el.icon}
                  </span>
                  <span className="text-xs text-muted-foreground">{el.type.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Layers
            </h3>
            <div className="text-xs text-muted-foreground text-center py-4">
              No layers selected
            </div>
          </div>
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 flex items-center justify-center p-4 bg-muted/20 overflow-auto">
          <div className="canvas-container w-full max-w-2xl aspect-[1.414] relative">
            {/* Certificate background */}
            <div
              className="absolute inset-0 rounded-sm"
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                boxShadow: "inset 0 0 60px rgba(0,0,0,0.3)",
              }}
            >
              {/* Decorative elements */}
              <div className="absolute top-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/10" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-white/5" />

              {/* Text elements */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center">
                <p className="text-white/90 text-2xl font-light tracking-widest uppercase">
                  Certificate of Completion
                </p>
              </div>

              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
                <p className="text-white text-4xl font-semibold tracking-wide">
                  {{recipient_name}}
                </p>
                <p className="text-white/60 text-sm mt-2 font-light">
                  This is hereby certifies that
                </p>
              </div>

              <div className="absolute top-2/3 left-1/2 -translate-x-1/2 text-center">
                <p className="text-white/70 text-lg">
                  <span className="font-medium text-white">{{course_name}}</span>
                </p>
                <p className="text-white/50 text-sm mt-1">
                  Issued on {{issue_date}}
                </p>
              </div>

              {/* QR placeholder */}
              <div className="absolute bottom-1/4 right-8 w-20 h-20 bg-white/10 rounded flex items-center justify-center border border-white/20">
                <div className="text-center text-white/40 text-xs">
                  <div className="grid grid-cols-5 gap-0.5 w-12 h-12 mx-auto mb-1">
                    {Array.from({ length: 25 }, (_, i) => (
                      <div
                        key={i}
                        className="rounded-sm"
                        style={{
                          background: Math.random() > 0.5 ? "rgba(255,255,255,0.3)" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[8px]">Scan to verify</span>
                </div>
              </div>
            </div>

            {/* Selection indicator */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] text-white/60 bg-white/10 border border-white/20">
                  Click to select
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* Right: Properties panel */}
        <aside className="properties-panel">
          <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Properties
            </h3>
          </div>

          <div className="inspector-content">
            <div className="text-center py-8 text-muted-foreground text-sm">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-3 opacity-40"
              >
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Select an element to edit its properties
            </div>

            {/* Dynamic fields quick add */}
            <div className="mt-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Quick add dynamic field</h4>
              <div className="flex flex-wrap gap-1">
                {["recipient_name", "course_name", "issue_date", "certificate_id"].map((field) => (
                  <button
                    key={field}
                    onClick={() => {/* Add field to canvas */}}
                    className="px-2 py-1 text-xs rounded border"
                    style={{
                      borderColor: "hsl(var(--border))",
                      background: "hsl(var(--muted))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {field}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas controls */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
              <h4 className="text-xs font-medium text-muted-foreground mb-3">Canvas</h4>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm flex-1 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Zoom
                </button>
                <button className="btn btn-ghost btn-sm flex-1 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6"/>
                    <path d="M9 21H3v-6"/>
                    <path d="M21 3l-7 7"/>
                    <path d="M3 21l7-7"/>
                  </svg>
                  Fit
                </button>
                <button className="btn btn-ghost btn-sm flex-1 text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="9" y1="21" x2="9" y2="9"/>
                  </svg>
                  Grid
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function handleUndo() {}
