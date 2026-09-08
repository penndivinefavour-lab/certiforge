// Footer Component
export default function Footer() {
  return (
    <footer className="py-12 border-t border-[hsl(var(--border))] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(270,70%,50%)] flex items-center justify-center">
              <span className="text-white font-bold text-xs">CF</span>
            </div>
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
              CertiForge
            </span>
          </div>
          
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            © {new Date().getFullYear()} CertiForge. Professional certificate generation made simple.
          </p>
        </div>
      </div>
    </footer>
  );
}
