import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import hubinhoLogo from '@/assets/hubinho-logo.png';

interface WelcomeAnimationProps {
  userName: string;
  onComplete: () => void;
}

export function WelcomeAnimation({ userName, onComplete }: WelcomeAnimationProps) {
  const [stage, setStage] = useState(0);
  const [typedText, setTypedText] = useState('');
  
  const firstName = userName.split(' ')[0] || 'Você';
  
  const welcomeText = `Olá, ${firstName}! Sou o Hubinho, seu copiloto de logística. Estou aqui para ajudar você a rastrear cargas, gerar relatórios e muito mais.`;
  
  // Stage progression
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),   // Show icon
      setTimeout(() => setStage(2), 800),   // Show sparkles
      setTimeout(() => setStage(3), 1200),  // Start typing
    ];
    
    return () => timers.forEach(clearTimeout);
  }, []);
  
  // Typing animation
  useEffect(() => {
    if (stage < 3) return;
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < welcomeText.length) {
        setTypedText(welcomeText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        // Complete after a brief pause
        setTimeout(onComplete, 1500);
      }
    }, 25);
    
    return () => clearInterval(interval);
  }, [stage, welcomeText, onComplete]);
  
  return (
    <motion.div 
      className="flex flex-col items-center justify-center h-full px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative flex flex-col items-center max-w-md">
        {/* Animated Icon */}
        <AnimatePresence>
          {stage >= 1 && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15 
              }}
              className="relative mb-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                <img src={hubinhoLogo} alt="Hubinho" className="w-14 h-14 object-contain" />
              </div>
              
              {/* Sparkles around icon */}
              {stage >= 2 && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute -bottom-1 -left-3"
                  >
                    <Sparkles className="w-4 h-4 text-primary/70 animate-pulse" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute top-1/2 -right-4"
                  >
                    <Sparkles className="w-3 h-3 text-primary/50 animate-pulse" />
                  </motion.div>
                </>
              )}
              
               {/* Pulsing ring removido para não criar “borda” ao redor do logo */}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Name badge */}
        <AnimatePresence>
          {stage >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <span className="text-2xl font-bold text-foreground flex items-center gap-2">
                Hubinho
                <Sparkles className="w-5 h-5 text-primary" />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Typing text bubble */}
        <AnimatePresence>
          {stage >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="glass-input rounded-2xl p-5 shadow-xl max-w-sm"
            >
              <p className="text-sm leading-relaxed text-foreground/90">
                {typedText}
                {typedText.length < welcomeText.length && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                  />
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Skip hint */}
        <AnimatePresence>
          {stage >= 3 && typedText.length >= welcomeText.length && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-xs text-muted-foreground"
            >
              Preparando seu assistente...
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
