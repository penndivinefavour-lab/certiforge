"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function UploadTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (f: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(f.type)) {
      alert("Please upload a PNG, JPEG, or WebP image.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert("File must be less than 10MB.");
      return;
    }
    setFile(f);
  };

  const uploadTemplate = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch(`/api/projects/${projectId}/templates/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/projects/${projectId}/templates/${data.template.id}/edit`);
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <span className="font-semibold">Upload certificate</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <h2 className="text-xl font-semibold mb-2">Upload a certificate design</h2>
          <p className="text-muted-foreground mb-8">
            Upload an existing certificate image to use as a template, or choose to start from scratch with the visual editor.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="border-2 border-dashed rounded-xl p-12 text-center transition-all"
            style={{
              borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
              background: isDragging ? "hsl(var(--primary) / 0.05)" : "hsl(var(--card))",
            }}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-lg overflow-hidden mb-4 flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
                  <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <p className="font-medium mb-1">{file.name}</p>
                <p className="text-sm text-muted-foreground mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  onClick={uploadTemplate}
                  disabled={uploading}
                  className="btn btn-primary"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Upload template
                    </>
                  )}
                </button>
                <button
                  onClick={() => setFile(null)}
                  className="btn btn-ghost btn-sm mt-2"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{
                  background: "hsl(var(--primary) / 0.1)",
                  color: "hsl(var(--primary))",
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <p className="font-medium mb-2">Drop your certificate image here</p>
                <p className="text-sm text-muted-foreground mb-6">
                  or click to browse — PNG, JPEG, WebP up to 10MB
                </p>
                <label className="btn btn-primary cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Choose file
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </label>
              </>
            )}
          </div>

          {/* Or start from scratch */}
          <div className="mt-8 text-center">
            <div className="h-px bg-border" style={{ background: "hsl(var(--border))" }} />
            <p className="text-sm text-muted-foreground mt-4 mb-4">or</p>
            <button
              onClick={() => router.push(`/projects/${projectId}/templates/new`)}
              className="btn btn-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              Start from scratch with the editor
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
