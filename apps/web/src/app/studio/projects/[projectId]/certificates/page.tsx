'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const DB_NAME = 'certiforge-studio';
const PROJECTS_STORE = 'projects';
const CERTIFICATES_STORE = 'certificates';

interface Certificate {
  id: string;
  projectId: string;
  certificateNumber: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  templateId: string;
  status: 'PENDING' | 'GENERATED' | 'FAILED';
  pdfUrl?: string;
  qrCodeUrl?: string;
  generatedAt: number;
}

export default function CertificatesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<any>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Certificates] Loading for project:', projectId);
    
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

    const loadData = () => {
      try {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
            db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(CERTIFICATES_STORE)) {
            db.createObjectStore(CERTIFICATES_STORE, { keyPath: 'id' });
          }
        };

        request.onsuccess = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          
          // Load project
          const projectTx = db.transaction(PROJECTS_STORE, 'readonly');
          const projectStore = projectTx.objectStore(PROJECTS_STORE);
          const projectRequest = projectStore.get(projectId);
          
          projectRequest.onsuccess = () => {
            setProject(projectRequest.result || null);
          };
          
          projectRequest.onerror = () => {
            setError('Failed to load project');
            setLoading(false);
          };

          // Load certificates for this project
          const certTx = db.transaction(CERTIFICATES_STORE, 'readonly');
          const certStore = certTx.objectStore(CERTIFICATES_STORE);
          const allCerts = certStore.getAll();
          
          allCerts.onsuccess = () => {
            const projectCerts = (allCerts.result || []).filter(
              (c: Certificate) => c.projectId === projectId
            );
            console.log('[Certificates] Found', projectCerts.length, 'certificates');
            setCertificates(projectCerts);
            setLoading(false);
            db.close();
          };
          
          allCerts.onerror = () => {
            console.error('[Certificates] Failed to load:', allCerts.error);
            setLoading(false);
            db.close();
          };
        };

        request.onerror = () => {
          setError('Failed to open database');
          setLoading(false);
        };
      } catch (err) {
        console.error('[Certificates] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setLoading(false);
      }
    };

    loadData();

    return () => clearTimeout(timeout);
  }, [projectId, loading]);

  const handleDownload = async (cert: Certificate) => {
    console.log('[Certificates] Downloading:', cert.certificateNumber);
    // In real implementation, this would trigger a download from the server
    // For now, show an alert
    alert(`Certificate ${cert.certificateNumber} downloaded!\n\nIn production, this would download the PDF file.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading certificates...</p>
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
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link 
            href={`/studio/projects/${projectId}`} 
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← Back to Project
          </Link>
          <h1 className="text-2xl font-bold">Certificates</h1>
          {project && (
            <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
          )}
        </div>
        <button 
          onClick={() => router.push(`/studio/projects/${projectId}/generate`)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
        >
          + Generate Certificates
        </button>
      </div>

      {certificates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-xl font-semibold mb-2">No certificates yet</h2>
          <p className="text-muted-foreground mb-6">Generate certificates for your recipients</p>
          <button 
            onClick={() => router.push(`/studio/projects/${projectId}/generate`)}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90"
          >
            Generate Certificates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="card p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-sm">{cert.recipientName || 'Unknown'}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {cert.certificateNumber}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  cert.status === 'GENERATED' 
                    ? 'bg-green-100 text-green-800' 
                    : cert.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {cert.status}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground mb-4">
                {new Date(cert.generatedAt).toLocaleString()}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDownload(cert)}
                  className="flex-1 py-2 rounded text-sm btn-secondary"
                >
                  Download PDF
                </button>
                <Link
                  href={`/verify/${cert.certificateNumber}`}
                  className="px-3 py-2 rounded text-sm btn-secondary"
                >
                  Verify
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
