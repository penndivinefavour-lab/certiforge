"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "organizations">("profile");

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
          <div className="sidebar-section">SYSTEM</div>
          <button
            onClick={() => setActiveTab("profile")}
            className={`sidebar-item ${activeTab === "profile" ? "active" : ""}`}
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`sidebar-item ${activeTab === "security" ? "active" : ""}`}
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Security
          </button>
          <button
            onClick={() => setActiveTab("organizations")}
            className={`sidebar-item ${activeTab === "organizations" ? "active" : ""}`}
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
              <path d="M3 7V3h2v4"/>
              <path d="M17 11h2v4h-2z"/>
              <path d="M17 11V5a2 2 0 0 0-2-2h-2"/>
              <path d="M7 11V5a2 2 0 0 0-2-2H3"/>
            </svg>
            Organizations
          </button>
        </nav>
      </aside>

      {/* Content */}
      <main className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-header-title">Settings</h1>
          <p className="dashboard-header-subtitle">Manage your account and preferences</p>
        </div>

        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="max-w-2xl">
              <div className="p-6 rounded-xl border" style={{ borderColor: "hsl(var(--border))" }}>
                <h2 className="text-xl font-semibold mb-6">Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Full name</label>
                    <input
                      type="text"
                      className="form-input"
                      defaultValue="Penn Divine Favour"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      defaultValue="admin@certiforge.demo"
                      disabled
                    />
                    <p className="form-hint">Email cannot be changed.</p>
                  </div>
                  <div>
                    <label className="form-label">Avatar URL (optional)</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary">Save changes</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="max-w-2xl">
              <div className="p-6 rounded-xl border" style={{ borderColor: "hsl(var(--border))" }}>
                <h2 className="text-xl font-semibold mb-6">Security</h2>

                <div className="space-y-4">
                  <div className="settings-row">
                    <div>
                      <p className="settings-row-label">Current password</p>
                      <p className="settings-row-description">Last changed 30 days ago</p>
                    </div>
                    <button className="btn btn-secondary btn-sm">Change</button>
                  </div>

                  <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                    <h3 className="font-medium mb-2">API Keys</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      API keys allow programmatic access to your account.
                    </p>
                    <button className="btn btn-secondary btn-sm">Generate new key</button>
                  </div>

                  <div className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                    <h3 className="font-medium mb-2">Sessions</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage your active sessions.
                    </p>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Current session</p>
                        <p className="text-xs text-muted-foreground">Chrome on Windows • Active now</p>
                      </div>
                      <span className="badge badge-success">Active</span>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn btn-danger">Sign out all other sessions</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "organizations" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="max-w-2xl">
              <div className="p-6 rounded-xl border" style={{ borderColor: "hsl(var(--border))" }}>
                <h2 className="text-xl font-semibold mb-6">Organizations</h2>

                <div className="space-y-4">
                  {[
                    {
                      name: "CertiForge Demo",
                      slug: "certiforge-demo",
                      role: "Owner",
                      memberSince: "January 2026",
                      color: "#1a1a2e",
                    },
                  ].map((org) => (
                    <div key={org.slug} className="p-4 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                          style={{ background: org.color }}
                        >
                          {org.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.slug}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="badge badge-primary">{org.role}</span>
                          <p className="text-xs text-muted-foreground">{org.memberSince}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Create organization
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
