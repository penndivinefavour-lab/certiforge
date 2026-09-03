"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

const TEMPLATES = [
  {
    id: "course-completion",
    name: "Course Completion",
    description: "Traditional academic certificate with ornate border",
    orientation: "landscape",
    color: "#1a1a2e",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18"/>
        <path d="M9 3v18"/>
        <line x1="7" y1="7" x2="7" y2="17"/>
        <line x1="17" y1="7" x2="17" y2="17"/>
      </svg>
    ),
  },
  {
    id: "participation",
    name: "Participation",
    description: "Simple, clean certificate for event participation",
    orientation: "portrait",
    color: "#2d5016",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    ),
  },
  {
    id: "achievement",
    name: "Achievement",
    description: "Award-style certificate with medal accent",
    orientation: "landscape",
    color: "#b8860b",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v12"/>
        <path d="M8 8l4-4 4 4"/>
        <path d="M8 16l4 4 4-4"/>
      </svg>
    ),
  },
  {
    id: "excellence",
    name: "Excellence",
    description: "Premium certificate for outstanding performance",
    orientation: "landscape",
    color: "#8b0000",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    id: "workshop",
    name: "Workshop",
    description: "Compact certificate for short workshops",
    orientation: "portrait",
    color: "#4a5568",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    id: "training",
    name: "Training",
    description: "Professional training completion certificate",
    orientation: "landscape",
    color: "#2c3e50",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
  {
    id: "internship",
    name: "Internship",
    description: "Modern certificate for internship completion",
    orientation: "portrait",
    color: "#3498db",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "appreciation",
    name: "Appreciation",
    description: "Warm certificate to show appreciation",
    orientation: "portrait",
    color: "#e67e22",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    id: "academic",
    name: "Academic",
    description: "Formal academic certificate with seal",
    orientation: "landscape",
    color: "#1b4332",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        <circle cx="12" cy="10" r="2"/>
      </svg>
    ),
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Professional corporate certificate",
    orientation: "landscape",
    color: "#0f172a",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="13" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/>
        <line x1="2" y1="11" x2="22" y2="11"/>
      </svg>
    ),
  },
];

export default function TemplateLibraryPage() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;

  const [search, setSearch] = useState("");
  const [selectedOrientation, setSelectedOrientation] = useState<string>("all");

  const filteredTemplates = TEMPLATES.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesOrientation = selectedOrientation === "all" || t.orientation === selectedOrientation;
    return matchesSearch && matchesOrientation;
  });

  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    // Create a new template from the library template
    router.push(`/organizations/${organizationId}/templates/create/${template.id}`);
  };

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
          <button
            onClick={() => router.push(`/organizations/${organizationId}`)}
            className="btn btn-ghost btn-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => router.push(`/organizations/${organizationId}`)}
            className="sidebar-item"
          >
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"/>
              <rect x="14" y="3" width="7" height="5"/>
              <rect x="14" y="12" width="7" height="9"/>
              <rect x="3" y="16" width="7" height="5"/>
            </svg>
            Back to organization
          </button>
          <button className="sidebar-item active">
            <svg className="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Template library
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="dashboard-content">
        <div className="dashboard-header flex items-center justify-between">
          <div>
            <h1 className="dashboard-header-title">Template library</h1>
            <p className="dashboard-header-subtitle">Choose a starting design for your certificates</p>
          </div>
          <button
            onClick={() => router.push(`/organizations/${organizationId}/templates/create`)}
            className="btn btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Blank template
          </button>
        </div>

        {/* Search and filters */}
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
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {["all", "landscape", "portrait"].map((o) => (
              <button
                key={o}
                onClick={() => setSelectedOrientation(o)}
                className={`data-table-filter ${selectedOrientation === o ? "active" : ""}`}
              >
                {o === "all" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Templates grid */}
        {filteredTemplates.length === 0 ? (
          <div className="empty-state max-w-md">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="empty-state-title">No templates match your search</p>
            <p className="empty-state-description">
              Try a different search term or filter.
            </p>
            <button
              onClick={() => { setSearch(""); setSelectedOrientation("all"); }}
              className="btn btn-secondary btn-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates.map((template, i) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="template-card"
                onClick={() => handleSelectTemplate(template)}
              >
                <div
                  className="template-preview"
                  style={{
                    background: template.color,
                    aspectRatio: template.orientation === "portrait" ? "3/4" : "16/10",
                  }}
                >
                  {template.icon}
                </div>
                <h4 className="template-name">{template.name}</h4>
                <p className="template-description">{template.description}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {template.orientation === "landscape" ? "Landscape" : "Portrait"}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
