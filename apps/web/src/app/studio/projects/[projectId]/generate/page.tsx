'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import JSZip from 'jszip';

export default function StudioGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [step, setStep] = useState<'select' | 'generating' | 'download'>('select');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [generated, setGenerated] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const res = await fetch(`/api/studio/projects/${projectId}`);
      const data = await res.json();
      if (data.project) {
        setTemplates(data.project.templates || []);
      }
      
      const recsRes = await fetch(`/api/studio/projects/${projectId}/recipients`);
      const recsData = await recsRes.json();
      if (recsData.recipients) {
        setRecipients(recsData.recipients);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    
    setStep('generating');
    
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          recipients: recipients.map(r => ({
            id: r.id,
            name: r.name,
            email: r.email,
            metadata: r.metadata || {},
          })),
        }),
      });
      
      const data = await res.json();
      if (data.certificates) {
        setGenerated(data.certificates);
        setStep('download');
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleDownloadAll = async () => {
    if (generated.length === 0) return;
    
    setDownloading(true);
    
    try {
      const zip = new JSZip();
      
      for (const cert of generated) {
        if (cert.pdfData) {
          const base64 = cert.pdfData.replace(/^data:application\/pdf;base64,/, '');
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          zip.file(`certificate-${cert.certificateNumber}.pdf`, bytes);
        }
      }
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificates-${projectId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (step === 'select') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <header className="border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.push(`/studio/projects/${projectId}`)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to project
            </button>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
              Generate Certificates
            </h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                1. Select Template
              </h2>
              {templates.length === 0 ? (
                <div className="p-6 rounded-xl border text-center" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-muted-foreground">No templates available. Please create a template first.</p>
                  <button
                    onClick={() => router.push(`/studio/projects/${projectId}/editor`)}
                    className="mt-4 px-4 py-2 rounded-lg font-medium"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    Create Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 rounded-xl border text-left transition-all hover:scale-105 ${
                        selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{
                        borderColor: selectedTemplate === template.id ? 'var(--primary)' : 'var(--border)',
                        background: selectedTemplate === template.id ? 'var(--accent)' : 'var(--card)',
                      }}
                    >
                      <div className="text-3xl mb-2">📄</div>
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.orientation}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                2. Recipients ({recipients.length})
              </h2>
              <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                <p className="text-muted-foreground">
                  Generating {recipients.length} certificate{recipients.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedTemplate || recipients.length === 0}
              className="w-full py-3 rounded-lg font-medium text-lg disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Generate Certificates
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Generating Certificates...
          </h2>
          <p className="text-muted-foreground mt-2">
            Please wait while we create your certificates
          </p>
        </div>
      </div>
    );
  }

  if (step === 'download') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <header className="border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.push(`/studio/projects/${projectId}`)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to project
            </button>
            <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>
              Certificates Generated
            </h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              {generated.length} Certificates Ready
            </h2>
            <p className="text-muted-foreground mb-8">
              Your certificates have been generated successfully
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                className="px-8 py-3 rounded-lg font-medium text-lg"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                {downloading ? 'Downloading...' : 'Download All (ZIP)'}
              </button>
              
              <button
                onClick={() => router.push(`/studio/projects/${projectId}`)}
                className="px-8 py-3 rounded-lg font-medium text-lg border"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return null;
}
