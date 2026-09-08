// How It Works Section Component
const steps = [
  { number: '01', title: 'Start Creating', description: 'Open Studio without an account' },
  { number: '02', title: 'Upload Template', description: 'Choose or create your certificate' },
  { number: '03', title: 'Import Recipients', description: 'Add your participant list' },
  { number: '04', title: 'Generate & Download', description: 'Get your certificates instantly' },
];

export default function HowItWorks() {
  return (
    <section className="py-24 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(var(--primary)/0.03)] to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(var(--foreground))] mb-4">
            How It Works
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
            Four simple steps to create professional certificates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-full w-full h-px">
                  <div className="h-full bg-gradient-to-r from-[hsl(var(--primary)/0.4)] to-[hsl(var(--border))]" />
                </div>
              )}

              <div className="text-center">
                <div className="step-number mx-auto mb-4 relative z-10">
                  {step.number}
                </div>
                <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
