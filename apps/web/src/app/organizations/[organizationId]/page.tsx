"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

interface Organization {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  logoUrl: string | null;
  memberCount?: number;
  projectCount?: number;
}

export default function OrganizationDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchOrganization();
    }
  }, [organizationId]);

  const fetchOrganization = async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}`);
      const data = await res.json();
      setOrganization(data.organization);
    } catch (error) {
      router.push("/dashboard");
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

  if (!organization) return null;

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
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">OVERVIEW</div>
          <button
            onClick={() => router.push(`/organizations/${organizationId}`)}
            className="sidebar-item active"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"/>
              <rect x="14" y="3" width="7" height="5"/>
              <rect x="14" y="12" width="7" height="9"/>
              <rect x="3" y="16" width="7" height="5"/>
            </svg>
            Overview
          </button>

          <div className="sidebar-section">WORKSPACE</div>
          <button
            onClick={() => router.push(`/organizations/${organizationId}/projects`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
              <path d="M3 7V3h2v4"/>
              <path d="M17 11h2v4h-2z"/>
              <path d="M17 11V5a2 2 0 0 0-2-2h-2"/>
              <path d="M7 11V5a2 2 0 0 0-2-2H3"/>
            </svg>
            Projects
          </button>
          <button
            onClick={() => router.push(`/organizations/${organizationId}/certificates`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Certificates
          </button>
          <button
            onClick={() => router.push(`/organizations/${organizationId}/recipients`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Recipients
          </button>
          <button
            onClick={() => router.push(`/organizations/${organizationId}/templates`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Templates
          </button>
          <button
            onClick={() => router.push(`/organizations/${organizationId}/verifications`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Verifications
          </button>

          <div className="sidebar-section">INSIGHTS</div>
          <button className="sidebar-item">
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Analytics
          </button>

          <div className="sidebar-section mt-4">SYSTEM</div>
          <button
            onClick={() => router.push(`/organizations/${organizationId}/settings`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{
              background: "hsl(var(--primary) / 0.15)",
              color: "hsl(var(--primary))",
            }}>
              O
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{organization.name}</p>
              <p className="text-xs text-muted-foreground truncate">{organization.slug}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header flex items-center justify-between">
          <div>
            <h1 className="dashboard-header-title">{organization.name}</h1>
            <p className="dashboard-header-subtitle">{organization.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/organizations/${organizationId}/projects/new`)}
              className="btn btn-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New project
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="metric-card"
          >
            <p className="metric-label">Total Projects</p>
            <p className="metric-value">{organization.projectCount || 0}</p>
            <p className="metric-change positive">+2 this month</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="metric-card"
          >
            <p className="metric-label">Certificates Issued</p>
            <p className="metric-value">0</p>
            <p className="metric-change">No certificates yet</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="metric-card"
          >
            <p className="metric-label">Recipients</p>
            <p className="metric-value">0</p>
            <p className="metric-change">No recipients yet</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="metric-card"
          >
            <p className="metric-label">Verification Rate</p>
            <p className="metric-value">—</p>
            <p className="metric-change">No verifications yet</p>
          </motion.div>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl border bg-card cursor-pointer hover:border-primary/50 transition-colors"
            style={{ borderColor: "hsl(var(--border))" }}
            onClick={() => router.push(`/organizations/${organizationId}/projects/new`)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Create a project</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Start a new certificate program for this organization.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-xl border bg-card cursor-pointer hover:border-primary/50 transition-colors"
            style={{ borderColor: "hsl(var(--border))" }}
            onClick={() => router.push(`/organizations/${organizationId}/templates`)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: "hsl(140 60% 15%)",
                color: "hsl(140 60% 60%)",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Manage templates</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Create or edit certificate designs for this organization.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Projects list */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent projects</h2>
          {organization.projectCount === 0 ? (
            <div className="empty-state max-w-md">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
                  <path d="M3 7V3h2v4"/>
                  <path d="M17 11h2v4h-2z"/>
                  <path d="M17 11V5a2 2 0 0 0-2-2h-2"/>
                  <path d="M7 11V5a2 2 0 0 0-2-2H3"/>
                </svg>
              </div>
              <p className="empty-state-title">No projects yet</p>
              <p className="empty-state-description">
                Create your first project to start issuing certificates.
              </p>
              <button
                onClick={() => router.push(`/organizations/${organizationId}/projects/new`)}
                className="btn btn-primary btn-lg mt-4"
              >
                Create project
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Placeholder for projects list */}
              <p className="text-muted-foreground col-span-3 text-center py-8">
                Projects will appear here once created.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
