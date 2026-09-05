'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function StudioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartCreating = async () => {
    setLoading(true);
    try {
      // Navigate to studio projects page
      router.push('/studio/projects');
    } catch (error) {
      console.error('Failed to start studio:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-2">CERTIFORGE</h1>
          <p className="text-xl text-white/60">Open Studio</p>
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl text-white/80 mb-4"
        >
          Create professional certificates without the busywork.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-white/50 mb-12"
        >
          No account required. No signup. Just create.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleStartCreating}
            disabled={loading}
            className="px-12 py-4 text-lg font-semibold rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)',
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting Studio...
              </span>
            ) : (
              'Start Creating — No Account Required'
            )}
          </button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 grid grid-cols-3 gap-8 text-center"
        >
          <div>
            <div className="text-3xl mb-2">📄</div>
            <p className="text-white/60 text-sm">Upload Templates</p>
          </div>
          <div>
            <div className="text-3xl mb-2">👥</div>
            <p className="text-white/60 text-sm">Import Recipients</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🎓</div>
            <p className="text-white/60 text-sm">Generate Certificates</p>
          </div>
        </motion.div>

        {/* Privacy Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-sm text-white/30"
        >
          Your workspace is stored locally in this browser. Data never leaves your device.
        </motion.p>
      </motion.div>
    </div>
  );
}
