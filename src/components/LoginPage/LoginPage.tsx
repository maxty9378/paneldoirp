import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedBackground } from './AnimatedBackground';
import { NeuralNetworkBackground } from './NeuralNetworkBackground';
import { GlowEffects } from './GlowEffects';
import { LoginForm } from './LoginForm';

interface LoginPageProps {
  onSuccess?: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-green-50 to-emerald-100">
      {/* Нейросеть фон */}
      <NeuralNetworkBackground />
      
      {/* Анимированные частицы */}
      <AnimatedBackground />
      
      {/* Световые эффекты */}
      <GlowEffects />
      
      {/* Дополнительные декоративные элементы */}
      <div className="absolute inset-0">
        {/* Градиентные круги */}
        <div className="absolute -top-40 -right-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-20 bg-gradient-to-br from-[#06A478] to-[#4ade80]" />
        <div className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-20 bg-gradient-to-br from-[#4ade80] to-[#86efac]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full blur-3xl opacity-15 bg-gradient-to-br from-[#06A478] to-[#22c55e]" />
        
      </div>

      {/* Основной контент */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <LoginForm onSuccess={onSuccess} />
        </motion.div>
      </div>

      {/* Дополнительные анимированные элементы */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Плавающие элементы */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-[#06A478] rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
