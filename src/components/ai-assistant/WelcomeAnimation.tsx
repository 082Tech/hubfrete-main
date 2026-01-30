import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import hubinhoIntroVideo from '@/assets/hubinho-intro.mp4';

interface WelcomeAnimationProps {
  userName: string;
  onComplete: () => void;
}

export function WelcomeAnimation({ userName, onComplete }: WelcomeAnimationProps) {
  const [stage, setStage] = useState(0);
  // Stage 0: Black overlay fades in
  // Stage 1: Video appears and plays
  // Stage 2: Fade out everything
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 400),   // Show video
      setTimeout(() => setStage(2), 5500),  // Start fade out (after video ~5s)
      setTimeout(() => onComplete(), 6200), // Complete transition
    ];
    
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);
  
  return (
    <motion.div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Dark overlay background */}
      <motion.div 
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 ? 0.92 : 0 }}
        transition={{ duration: 0.6 }}
      />
      
      {/* Video container */}
      <AnimatePresence>
        {stage >= 1 && stage < 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 25
            }}
            className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-primary/30"
            style={{
              maxWidth: '400px',
              width: '90vw',
            }}
          >
            {/* Glowing border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-emerald-500 to-teal-400 rounded-3xl blur-lg opacity-60 animate-pulse" />
            
            <div className="relative rounded-3xl overflow-hidden bg-background">
              <video
                autoPlay
                muted
                playsInline
                className="w-full h-auto block"
                onEnded={() => setStage(2)}
              >
                <source src={hubinhoIntroVideo} type="video/mp4" />
              </video>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fade-out overlay */}
      <motion.div
        className="absolute inset-0 bg-background pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 2 ? 1 : 0 }}
        transition={{ duration: 0.7 }}
      />
    </motion.div>
  );
}
