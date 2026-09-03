"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signin", email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        document.cookie = `session=${data.token}; path=/; max-age=604800; HttpOnly; Secure`;
        router.push("/dashboard");
      } else {
        setError(data.error || "Sign in failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 bg-card border-r" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex-1 flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
              </div>
              <span className="text-xl font-bold">CertiForge</span>
            </div>

            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-lg mb-12">
              Sign in to manage your certificates
            </p>

            {/* Demo accounts */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">Demo accounts</p>
              {[
                { email: "admin@certiforge.demo", password: "demo1234", role: "Admin" },
                { email: "editor@certiforge.demo", password: "demo1234", role: "Editor" },
                { email: "viewer@certiforge.demo", password: "demo1234", role: "Viewer" },
              ].map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword(demo.password);
                  }}
                  className="w-full p-3 rounded-lg border text-left transition-all hover:border-primary/50"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{demo.role}</p>
                      <p className="text-xs text-muted-foreground font-mono">{demo.email}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel - sign in form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </div>
            <span className="text-xl font-bold">CertiForge</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">Sign in</h1>
          <p className="text-muted-foreground mb-8">Enter your credentials to access your account</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-lg border text-sm" style={{
                borderColor: "hsl(var(--destructive))",
                background: "hsl(var(--destructive) / 0.05)",
                color: "hsl(var(--destructive))",
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => router.push("/auth/signup")}
              className="text-primary hover:underline font-medium"
            >
              Create one
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
