import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 0: Initial fade in
    // Stage 1: Logo and text visible
    // Stage 2: Fade out
    const timer1 = setTimeout(() => setStage(1), 100);
    const timer2 = setTimeout(() => setStage(2), 1800);
    const timer3 = setTimeout(() => onComplete(), 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 2 && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="flex flex-col items-center gap-6">
            {/* Logo Container */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={stage >= 1 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-primary-foreground/20"
                initial={{ scale: 1.2, opacity: 0 }}
                animate={stage >= 1 ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{ margin: '-8px' }}
              />
              
              {/* Logo box */}
              <div className="w-20 h-20 rounded-2xl bg-primary-foreground flex items-center justify-center shadow-2xl">
                <Truck className="w-10 h-10 text-primary" />
              </div>
            </motion.div>

            {/* Brand Text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={stage >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-4xl font-bold text-primary-foreground tracking-tight">
                Hub<span className="font-light">Frete</span>
              </h1>
              <motion.p
                className="text-primary-foreground/70 text-sm mt-2 font-medium tracking-wide"
                initial={{ opacity: 0 }}
                animate={stage >= 1 ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                Logística Inteligente
              </motion.p>
            </motion.div>

            {/* Subtle loading indicator */}
            <motion.div
              className="flex gap-1.5 mt-4"
              initial={{ opacity: 0 }}
              animate={stage >= 1 ? { opacity: 1 } : {}}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary-foreground/40"
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
