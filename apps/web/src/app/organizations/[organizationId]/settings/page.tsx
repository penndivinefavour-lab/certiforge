"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Organization {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  logoUrl: string | null;
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("EDITOR");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const orgId = window.location.pathname.split("/").pop();
    if (orgId) {
      fetchOrganization(orgId);
      fetchMembers(orgId);
    }
  }, []);

  const fetchOrganization = async (orgId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}`);
      const data = await res.json();
      setOrganization(data.organization);
    } catch (error) {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (orgId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  };

  const handleAddMember = async () => {
    if (!organization || !newMemberEmail) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${organization.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newMemberEmail, // In production, would look up user by email
          role: newMemberRole,
        }),
      });

      if (res.ok) {
        fetchMembers(organization.id);
        setNewMemberEmail("");
        setShowAddMember(false);
      } else {
        alert("Failed to add member");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setSaving(false);
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
          <div className="sidebar-section">SETTINGS</div>
          <button
            onClick={() => router.push(`/organizations/${organization.id}`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Back to organization
          </button>
          <button className="sidebar-item active">
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Organization settings
          </button>
        </nav>
      </aside>

      {/* Content */}
      <main className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-header-title">Organization settings</h1>
          <p className="dashboard-header-subtitle">Manage {organization.name}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Organization info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl border"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <h2 className="text-lg font-semibold mb-4">Organization info</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                  style={{ background: organization.primaryColor }}
                >
                  {organization.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xl font-semibold">{organization.name}</p>
                  <p className="text-muted-foreground">{organization.slug}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Organization name</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={organization.name}
                  />
                </div>
                <div>
                  <label className="form-label">Slug</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={organization.slug}
                    disabled
                  />
                  <p className="form-hint">URL-friendly identifier</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="form-label">Brand color</label>
                <input
                  type="color"
                  className="color-swatch"
                  defaultValue={organization.primaryColor}
                  style={{ width: "40px", height: "40px" }}
                />
                <input
                  type="text"
                  className="form-input flex-1"
                  defaultValue={organization.primaryColor}
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-primary">Save changes</button>
              </div>
            </div>
          </motion.div>

          {/* Team members */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl border"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Team members</h2>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="btn btn-primary btn-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add member
              </button>
            </div>

            {showAddMember && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 p-4 rounded-lg border bg-muted/30"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Email address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="colleague@company.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="form-label">Role</label>
                    <select
                      className="form-input"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <p className="form-hint">
                      {newMemberRole === "ADMIN" && "Can manage organization and all projects."}
                      {newMemberRole === "EDITOR" && "Can create and edit projects."}
                      {newMemberRole === "VIEWER" && "Read-only access."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddMember(false)}
                      className="btn btn-ghost btn-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMember}
                      disabled={saving || !newMemberEmail}
                      className="btn btn-primary btn-sm"
                    >
                      {saving ? "Adding..." : "Add member"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="member-row">
                  <div className="member-avatar">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="member-name truncate">{member.name}</p>
                    <p className="member-email truncate">{member.email}</p>
                  </div>
                  <span className="member-role">{member.role}</span>
                </div>
              ))}

              {members.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No team members yet
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
