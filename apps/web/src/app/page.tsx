// Open Studio Landing Page
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Navigation */}
      <nav className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>CertiForge</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/auth/signin" className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--foreground)' }}>
              Sign In
            </Link>
            <Link
              href="/studio"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Start Creating
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
            Create professional certificates without the busywork
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12">
            Design templates, import recipients, and generate beautiful certificates in minutes.
            No account required to get started.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/studio"
              className="px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:scale-105"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)' }}
            >
              Start Creating — No Account Required
            </Link>
            
            <Link
              href="/auth/signin"
              className="px-8 py-4 rounded-lg text-lg font-semibold border"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              Sign In
            </Link>
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground">
            Your workspace is stored locally. Data never leaves your browser.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🎨',
              title: 'Design Templates',
              description: 'Upload existing templates or create new ones with our visual editor.'
            },
            {
              icon: '📊',
              title: 'Import Recipients',
              description: 'Bulk import recipients from CSV or Excel files with automatic field mapping.'
            },
            {
              icon: '🎓',
              title: 'Generate Certificates',
              description: 'Create professional PDF certificates with QR codes for verification.'
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--foreground)' }}>
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {['Start Creating', 'Upload Template', 'Import Recipients', 'Generate & Download'].map((step, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold"
                  style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  {i + 1}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{step}</h3>
                {i < 3 && (
                  <div className="hidden md:block text-muted-foreground">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-24" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>© 2026 CertiForge. Professional certificate generation made simple.</p>
        </div>
      </footer>
    </div>
  );
}
