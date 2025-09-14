import React from 'react';
import { motion } from 'framer-motion';

interface GlowEffectsProps {
  className?: string;
}

export function GlowEffects({ className = '' }: GlowEffectsProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>

      {/* Волновые эффекты */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 20% 20%, rgba(6, 164, 120, 0.05) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 80%, rgba(74, 222, 128, 0.05) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(6, 164, 120, 0.05) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

    </div>
  );
}
