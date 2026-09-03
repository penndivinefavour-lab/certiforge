"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  role: string;
  projectCount: number;
  certificateCount: number;
  recipientCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    // Check auth
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          fetchOrganizations();
        } else {
          router.push("/");
        }
      })
      .catch(() => router.push("/"));
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (name: string, slug: string) => {
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      if (res.ok) {
        const data = await res.json();
        const newOrg = {
          id: data.organization.id,
          name: data.organization.name,
          slug: data.organization.slug,
          logoUrl: null,
          primaryColor: "#1a1a2e",
          role: "OWNER",
          projectCount: 0,
          certificateCount: 0,
          recipientCount: 0,
        };
        setOrganizations((prev) => [newOrg, ...prev]);
        router.push(`/organizations/${newOrg.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create organization");
      }
    } catch (error) {
      alert("Network error");
    }
  };

  const createProject = async (orgId: string, name: string, slug: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, name, slug }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/projects/${data.project.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create project");
      }
    } catch (error) {
      alert("Network error");
    }
  };

  const handleCreateOrg = () => {
    const name = prompt("Organization name:");
    if (!name) return;

    const slug = prompt("Organization slug (lowercase, hyphens only):", name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    if (!slug) return;

    createOrganization(name, slug);
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
          <div className="sidebar-section">WORKSPACE</div>
          {organizations.map((org) => (
            <div key={org.id} className="mb-4">
              <button
                onClick={() => router.push(`/organizations/${org.id}`)}
                className="sidebar-item"
              >
                <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
                  <path d="M3 7V3h2v4"/>
                  <path d="M17 11h2v4h-2z"/>
                  <path d="M17 11V5a2 2 0 0 0-2-2h-2"/>
                  <path d="M7 11V5a2 2 0 0 0-2-2H3"/>
                </svg>
                <span className="flex-1 truncate">{org.name}</span>
                <span className="text-xs text-muted-foreground">{org.role}</span>
              </button>
              <div className="ml-4 mt-1 mb-1">
                <button
                  onClick={() => router.push(`/organizations/${org.id}/settings`)}
                  className="sidebar-item text-xs py-1"
                >
                  <svg className="sidebar-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Settings
                </button>
              </div>
            </div>
          ))}

          {organizations.length === 0 && (
            <div className="mt-4 p-4 rounded-lg border text-center" style={{
              borderColor: "hsl(var(--border))",
              borderStyle: "dashed",
            }}>
              <p className="text-sm text-muted-foreground mb-3">No organizations yet</p>
              <button onClick={handleCreateOrg} className="btn btn-primary btn-sm w-full">
                Create organization
              </button>
            </div>
          )}

          <div className="sidebar-section mt-4">SYSTEM</div>
          <button
            onClick={() => router.push("/settings")}
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
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-header-title">Workspace</h1>
          <p className="dashboard-header-subtitle">Manage your certificate organizations</p>
        </div>

        {organizations.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org, i) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="project-card"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/organizations/${org.id}`)}
              >
                <div className="project-card-header">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-lg mr-3"
                    style={{ background: org.primaryColor }}
                  >
                    {org.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                      {org.role}
                    </span>
                  </div>
                </div>
                <h3 className="project-name">{org.name}</h3>
                <p className="project-meta">{org.slug}</p>
                <div className="project-stats">
                  <div className="project-stat">
                    <span className="project-stat-value">{org.projectCount}</span>
                    <span className="project-stat-label">Projects</span>
                  </div>
                  <div className="project-stat">
                    <span className="project-stat-value">{org.certificateCount}</span>
                    <span className="project-stat-label">Certificates</span>
                  </div>
                  <div className="project-stat">
                    <span className="project-stat-value">{org.recipientCount}</span>
                    <span className="project-stat-label">Recipients</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {organizations.length === 0 && (
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
            <p className="empty-state-title">No organizations yet</p>
            <p className="empty-state-description">
              Create your first organization to start issuing certificates.
            </p>
            <button onClick={handleCreateOrg} className="btn btn-primary btn-lg">
              Create organization
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
