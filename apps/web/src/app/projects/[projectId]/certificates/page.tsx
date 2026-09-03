"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

interface Certificate {
  id: string;
  certificateNumber: string;
  status: string;
  issuedAt: string | null;
  revokedAt: string | null;
  recipient: {
    id: string;
    name: string;
    email: string | null;
  };
}

export default function CertificatesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [projectId, page, search, statusFilter]);

  const fetchCertificates = async () => {
    try {
      const url = new URL(`/api/certificates?projectId=${projectId}&page=${page}&pageSize=${pageSize}`);
      if (search) url.searchParams.set("search", search);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);

      const res = await fetch(url);
      const data = await res.json();
      setCertificates(data.certificates || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    if (!confirm("Are you sure you want to revoke this certificate? This action cannot be undone.")) {
      return;
    }

    setRevoking(certificateId);
    try {
      const res = await fetch(`/api/certificates/${certificateId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Administrative revocation" }),
      });

      if (res.ok) {
        setCertificates((prev) =>
          prev.map((c) => (c.id === certificateId ? { ...c, status: "REVOKED", revokedAt: new Date().toISOString() } : c))
        );
      } else {
        const err = await res.json();
        alert(err.error || "Failed to revoke certificate");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setRevoking(null);
    }
  };

  const totalPages = Math.ceil((total || 0) / pageSize);

  if (loading && certificates.length === 0) {
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
            <span className="font-semibold">Certificates</span>
            <span className="badge">{total} total</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/projects/${projectId}/generate`)}
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

      <main className="container mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-xs">
            <div className="data-table-search-icon absolute left-3 top-1/2 -translate-y-1/2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Search by recipient name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2">
            {["all", "DRAFT", "GENERATED", "ISSUED", "REVOKED"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`data-table-filter ${statusFilter === s ? "active" : ""}`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {certificates.length === 0 ? (
          <div className="empty-state max-w-md">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <p className="empty-state-title">No certificates yet</p>
            <p className="empty-state-description">
              Generate certificates for your recipients to see them here.
            </p>
            <button
              onClick={() => router.push(`/projects/${projectId}/generate`)}
              className="btn btn-primary btn-lg mt-4"
            >
              Generate certificates
            </button>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="certificate-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Certificate ID</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id}>
                    <td className="font-medium">{cert.recipient.name}</td>
                    <td className="font-mono text-sm" style={{ color: "hsl(var(--primary))" }}>
                      {cert.certificateNumber}
                    </td>
                    <td>
                      <span className={`status-badge ${
                        cert.status === "DRAFT" ? "status-draft" :
                        cert.status === "GENERATED" ? "status-generated" :
                        cert.status === "ISSUED" ? "status-issued" :
                        "status-revoked"
                      }`}>
                        {cert.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground text-sm">
                      {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/projects/${projectId}/certificates/${cert.id}`)}
                          className="btn btn-ghost btn-sm px-2"
                          title="View"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        {cert.status === "ISSUED" && (
                          <button
                            onClick={() => handleRevoke(cert.id)}
                            disabled={revoking === cert.id}
                            className="btn btn-ghost btn-sm px-2 text-destructive"
                            title="Revoke"
                          >
                            {revoking === cert.id ? (
                              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 3v6h6"/>
                                <path d="M3 11a9 9 0 0 1 2.41-6.38"/>
                                <path d="M12 7v5l3-3"/>
                                <path d="M21 12a9 9 0 0 1-2.41 6.38"/>
                                <path d="M12 12v-5"/>
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: "hsl(var(--border))" }}>
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="pagination">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="pagination-button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 5 + i + 1;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`pagination-button ${page === pageNum ? "active" : ""}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="pagination-button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
