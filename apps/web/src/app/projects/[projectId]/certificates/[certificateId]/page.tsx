"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Certificate {
  id: string;
  certificateNumber: string;
  status: string;
  issuedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  recipient: {
    name: string;
    email: string | null;
  };
  project: {
    name: string;
  };
  templateVersion: {
    width: number;
    height: number;
    backgroundColor: string;
    orientation: string;
    elements: string;
  };
  events: Array<{
    id: string;
    eventType: string;
    actorId: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}

export default function CertificateDetailPage() {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This would be populated by the router params in a real app
    // For now, we'll use a demo certificate number or fetch from URL
    const certNum = window.location.pathname.split("/").pop();
    if (certNum) {
      fetchCertificate(certNum);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCertificate = async (certNum: string) => {
    try {
      const res = await fetch(`/api/certificates/${certNum}`);
      const data = await res.json();

      if (res.ok && data.certificate) {
        setCertificate(data.certificate);
      }
    } catch (error) {
      console.error("Failed to fetch certificate:", error);
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

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Certificate not found</p>
          <button className="btn btn-primary" onClick={() => window.history.back()}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="container mx-auto px-6 py-3">
          <button
            onClick={() => window.history.back()}
            className="btn btn-ghost btn-sm mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="certificate-detail-grid">
          {/* Main content */}
          <div className="certificate-detail-main">
            {/* Certificate preview */}
            <div className="cert-detail-preview relative">
              <div
                className="rounded-sm"
                style={{
                  background: certificate.templateVersion.backgroundColor || "#1a1a2e",
                  aspectRatio: `${certificate.templateVersion.width}/${certificate.templateVersion.height}`,
                  boxShadow: "0 4px 20px hsl(var(--muted) / 0.3)",
                }}
              >
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <p className="text-white/80 text-lg font-light tracking-widest uppercase mb-4">
                      Certificate of Completion
                    </p>
                    <p className="text-white text-3xl font-semibold mb-3">
                      {certificate.recipient.name}
                    </p>
                    <p className="text-white/60 text-base mb-4">
                      This certifies that
                    </p>
                    <p className="text-white/80 text-lg">
                      <span className="font-medium">{certificate.project.name}</span>
                    </p>
                    <p className="text-white/50 text-sm mt-4">
                      ID: {certificate.certificateNumber}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate details */}
            <div className="grid gap-4">
              <h2 className="text-lg font-semibold">Certificate Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Certificate ID</p>
                  <p className="font-mono text-primary">{certificate.certificateNumber}</p>
                </div>

                <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  <span className={`status-badge ${
                    certificate.status === "ISSUED" ? "status-issued" :
                    certificate.status === "REVOKED" ? "status-revoked" :
                    "status-draft"
                  }`}>
                    {certificate.status}
                  </span>
                </div>

                <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Recipient</p>
                  <p className="font-medium">{certificate.recipient.name}</p>
                  {certificate.recipient.email && (
                    <p className="text-sm text-muted-foreground">{certificate.recipient.email}</p>
                  )}
                </div>

                <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Program</p>
                  <p className="font-medium">{certificate.project.name}</p>
                </div>

                {certificate.issuedAt && (
                  <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Issued On</p>
                    <p className="font-medium">{new Date(certificate.issuedAt).toLocaleDateString()}</p>
                  </div>
                )}

                {certificate.revokedAt && (
                  <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.05)" }}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1" style={{ color: "hsl(var(--destructive))" }}>Revoked On</p>
                    <p className="font-medium" style={{ color: "hsl(var(--destructive))" }}>{new Date(certificate.revokedAt).toLocaleDateString()}</p>
                    {certificate.revocationReason && (
                      <p className="text-sm mt-1" style={{ color: "hsl(var(--destructive) / 0.8)" }}>
                        Reason: {certificate.revocationReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="certificate-detail-sidebar">
            <h3 className="font-semibold mb-4">Verification</h3>

            <div className="p-4 rounded-lg border mb-4" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Verification URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1 rounded truncate font-mono">
                  /verify/{certificate.certificateNumber}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(`/verify/${certificate.certificateNumber}`)}
                  className="btn btn-ghost btn-sm"
                  title="Copy URL"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* QR placeholder */}
            <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">QR Code</p>
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-white rounded flex items-center justify-center p-4">
                  <div className="text-center text-muted-foreground text-xs">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                      <rect x="14" y="14" width="3" height="3"/>
                      <rect x="18" y="14" width="3" height="3"/>
                      <rect x="14" y="18" width="3" height="3"/>
                    </svg>
                    <p className="mt-2">Scan to verify</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event history */}
            {certificate.events && certificate.events.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Activity</h3>
                <div className="space-y-1">
                  {certificate.events.slice(0, 5).map((event) => (
                    <div key={event.id} className="activity-item">
                      <div className={`activity-icon ${
                        event.eventType === "ISSUED" ? "success" :
                        event.eventType === "REVOKED" ? "danger" :
                        "info"
                      }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div className="activity-content">
                        <p className="activity-title text-sm">
                          {event.eventType.charAt(0) + event.eventType.slice(1).toLowerCase()}
                        </p>
                        <p className="activity-meta">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
