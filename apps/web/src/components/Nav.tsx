// Premium Navigation Component
import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[hsl(var(--border)/0.3)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(270,70%,50%)] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-200">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">
              CertiForge
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link 
              href="/auth/signin" 
              className="nav-link text-sm"
            >
              Sign In
            </Link>
            <Link
              href="/studio"
              className="btn btn-primary btn-sm"
            >
              Start Creating
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
