'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartCreating = async () => {
    setLoading(true);
    try {
      router.push('/studio/projects');
    } catch (error) {
      console.error('Failed to start studio:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      {/* Navigation */}
      <nav className="border-b border-[hsl(var(--border))] glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(270,70%,50%)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="text-lg font-semibold text-[hsl(var(--foreground))]">CertiForge</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link href="/auth/signin" className="nav-link">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[hsl(var(--primary))/0.08] rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-[hsl(260,60%,45%)/0.06] rounded-full blur-3xl" />
        </div>

        <div className="relative text-center max-w-2xl">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(270,60%,40%)] flex items-center justify-center shadow-2xl glow-primary">
              <span className="text-white font-bold text-3xl">CF</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-[hsl(var(--foreground))] mb-3">
            Open Studio
          </h1>
          
          <p className="text-xl text-[hsl(var(--muted-foreground))] mb-12">
            Create professional certificates without the busywork.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleStartCreating}
            disabled={loading}
            className="btn btn-primary btn-lg px-12 glow-primary disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </span>
            ) : (
              'Start Creating — No Account Required'
            )}
          </button>

          {/* Features Grid */}
          <div className="mt-16 grid grid-cols-3 gap-6 text-center">
            {[
              { icon: '📄', title: 'Upload Templates' },
              { icon: '👥', title: 'Import Recipients' },
              { icon: '🎓', title: 'Generate Certificates' },
            ].map((feature, i) => (
              <div key={i} className="p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                <div className="text-2xl mb-2">{feature.icon}</div>
                <p className="text-xs text-[hsl(var(--muted-foreground))">{feature.title}</p>
              </div>
            ))}
          </div>

          {/* Privacy Note */}
          <p className="mt-8 text-xs text-[hsl(var(--muted-foreground))]">
            Your workspace is stored locally in this browser. Data never leaves your device.
          </p>
        </div>
      </main>
    </div>
  );
}
