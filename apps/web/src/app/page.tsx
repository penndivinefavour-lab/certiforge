"use client";

import { useRouter } from "next/navigation";

const features = [
  { title: "Template Studio", desc: "Design beautiful certificate templates with our visual editor." },
  { title: "Bulk Generation", desc: "Import CSV/XLSX and generate thousands of certificates in minutes." },
  { title: "QR Verification", desc: "Every certificate has a unique QR code for instant authenticity checks." },
  { title: "PDF Export", desc: "Professional PDF certificates ready for printing or digital distribution." },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div>
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="container flex justify-between items-center" style={{ height: "4rem" }}>
          <div className="flex items-center" style={{ gap: "0.75rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                <path d="M2 17L12 22L22 17" />
              </svg>
            </div>
            <span className="text-xl font-bold">CertiForge</span>
          </div>
          <div className="flex" style={{ gap: "1rem" }}>
            <button onClick={() => router.push("/auth/signin")} className="btn btn-secondary">Sign In</button>
            <button onClick={() => router.push("/auth/signup")} className="btn btn-primary">Get Started</button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20">
          <div className="container text-center">
            <h1 className="text-5xl font-bold mb-6" style={{ color: "var(--foreground)" }}>
              Digital Certificates,<br />
              <span style={{ color: "var(--primary)" }}>Simplified.</span>
            </h1>
            <p className="text-xl mb-8" style={{ color: "var(--muted-foreground)" }}>
              Create, personalize, issue, and verify professional certificates at scale.
            </p>
            <div className="flex justify-center" style={{ gap: "1rem" }}>
              <button onClick={() => router.push("/auth/signup")} className="btn btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>
                Create Free Account
              </button>
              <button onClick={() => router.push("/verify")} className="btn btn-secondary" style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}>
                Verify Certificate
              </button>
            </div>
          </div>
        </section>

        <section className="border-b">
          <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
            <h2 className="text-center font-bold mb-4">All-in-one platform</h2>
            <p className="text-center mb-8" style={{ color: "var(--muted-foreground)" }}>
              From design to verification, CertiForge handles everything.
            </p>
            <div className="flex" style={{ gap: "1rem", flexWrap: "wrap" }}>
              {features.map((f, i) => (
                <div key={i} className="card" style={{ flex: "1", minWidth: "250px" }}>
                  <h3 className="mb-2">{f.title}</h3>
                  <p style={{ color: "var(--muted-foreground)" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderTopColor: "var(--border)", padding: "2rem 0", textAlign: "center", color: "var(--muted-foreground)" }}>
        <div className="container">
          <p>&copy; 2026 CertiForge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
