'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface Certificate {
  id: string;
  certificateNumber: string;
  status: string;
  recipient: {
    name: string;
    email?: string;
  };
  project: {
    name: string;
  };
  templateVersion: {
    width: number;
    height: number;
    backgroundColor: string;
    orientation: string;
  };
  issuedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
}

export default function StudioVerifyPage() {
  const params = useParams();
  const certificateNumber = params.certificateNumber as string;

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (certificateNumber) {
      fetchCertificate();
    }
  }, [certificateNumber]);

  const fetchCertificate = async () => {
    try {
      const res = await fetch(`/api/studio/verify/${certificateNumber}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Certificate not found');
        setLoading(false);
        return;
      }

      if (!data.certificate) {
        setError('Certificate not found');
        setLoading(false);
        return;
      }

      setCertificate(data.certificate);
    } catch (err) {
      setError('Failed to verify certificate');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl border text-center max-w-md" style={{
          borderColor: 'hsl(var(--destructive))',
          borderStyle: 'dashed',
        }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
            background: 'hsl(var(--destructive) / 0.1)',
            color: 'hsl(var(--destructive))',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
            Certificate Not Found
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            The certificate number <span className="font-mono">{certificateNumber}</span> does not exist or has been removed.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Note: Open Studio certificates are stored locally. If you cleared your browser data, the certificate may no longer be verifiable.
          </p>
        </div>
      </div>
    );
  }

  if (!certificate) return null;

  const isActive = certificate.status === 'ISSUED';
  const isRevoked = certificate.status === 'REVOKED';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <div
          className="rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: certificate.templateVersion.backgroundColor || 'var(--card)',
            boxShadow: '0 20px 60px hsl(0 0% 0% / 0.3)',
          }}
        >
          <div
            className="p-8 md:p-12 text-center"
            style={{
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p className="text-white/80 text-lg font-light tracking-widest uppercase mb-6">
              Certificate of Completion
            </p>

            <p
              className="text-3xl md:text-4xl font-semibold text-white mb-4"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            >
              {certificate.recipient.name}
            </p>

            <p className="text-white/60 text-base mb-6">
              This is hereby certified that
            </p>

            <p className="text-xl text-white/80 mb-4">
              <span className="font-medium">{certificate.project.name}</span>
            </p>

            <p className="text-white/50 text-sm">
              Issued on {certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : '—'}
            </p>

            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Certificate ID</p>
              <p className="text-white/70 text-sm font-mono">{certificate.certificateNumber}</p>
            </div>
          </div>

          <div className="px-8 py-4 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center gap-2">
              {isRevoked ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'hsl(0 65% 70%)' }}>
                    Certificate Revoked
                  </span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'hsl(140 60% 70%)' }}>
                    Certificate Verified
                  </span>
                </>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs text-white/50">Issued on</p>
              <p className="text-xs text-white/70">
                {certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
        >
          {isRevoked && certificate.revocationReason && (
            <p className="text-sm" style={{ color: 'hsl(0 65% 65%)' }}>
              Revocation reason: {certificate.revocationReason}
            </p>
          )}
          <p className="text-xs text-white/40 mt-4">
            Verified by CertiForge Open Studio • {new Date().toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This certificate was generated locally. Verification depends on local browser storage.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
