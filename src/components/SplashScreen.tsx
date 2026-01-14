import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Stage 0: Initial - truck off screen left
    // Stage 1: Truck enters and moves to center
    // Stage 2: Truck stops at center (pause moment)
    // Stage 3: Truck accelerates to exit right
    const timer1 = setTimeout(() => setStage(1), 100);   // Truck starts entering
    const timer2 = setTimeout(() => setStage(2), 300);  // Truck at center, pause
    const timer3 = setTimeout(() => setStage(3), 1500);  // Truck accelerates out
    const timer4 = setTimeout(() => onComplete(), 3000); // Animation complete

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  // Calculate truck position based on stage
  const getTruckStyle = () => {
    switch (stage) {
      case 0:
        return {
          left: '-350px',
          transition: 'none',
        };
      case 1:
        return {
          left: 'calc(43%)',
          transition: 'left 1.4s ease-out',
        };
      case 2:
        return {
          left: 'calc(43%)',
          transition: 'left 0.3s ease-out',
        };
      case 3:
        return {
          left: 'calc(100% + 350px)',
          transition: 'left 1s cubic-bezier(0.4, 0, 1, 1)',
        };
      default:
        return {
          left: 'calc(100% + 350px)',
          transition: 'left 1s ease-in',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/90 to-primary overflow-hidden">
      {/* Road */}
      <div className="absolute left-0 right-0 h-4 bg-secondary/30" style={{ bottom: 'calc(50% - 40px)' }}>
        <div className="absolute inset-0 flex items-center justify-center gap-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-12 h-1 bg-primary-foreground/50 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Truck with trailing banner - everything moves together */}
      <div
        className="absolute flex items-center"
        style={{
          bottom: 'calc(50% - 32px)',
          ...getTruckStyle(),
        }}
      >
        {/* Trailing Banner (behind the truck - to the left) */}
        <div className="flex items-center mr-2">
          {/* Rope/cable connecting to truck */}
          <div
            className="w-8 h-0.5 bg-primary-foreground/60"
            style={{
              animation: stage >= 1 && stage < 3 ? 'rope-wave 1.5s ease-in-out infinite' : 'none',
            }}
          />

          {/* Banner flag - airplane style */}
          <div
            className="relative flex items-center bg-primary-foreground rounded-lg shadow-xl px-4 py-2.5 origin-right"
            style={{
              animation: stage >= 1 && stage < 3 ? 'banner-flutter 2s ease-in-out infinite' : 'none',
            }}
          >
            {/* Banner content */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-primary whitespace-nowrap">
                Hub<span className="font-normal">Frete</span>
              </span>
            </div>

            {/* Banner tail ribbons */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <div
                className="w-3 h-1.5 bg-primary-foreground rounded-l-full"
                style={{ animation: 'ribbon-wave 1s ease-in-out infinite' }}
              />
              <div
                className="w-4 h-1.5 bg-primary-foreground rounded-l-full"
                style={{ animation: 'ribbon-wave 1s ease-in-out infinite 0.1s' }}
              />
              <div
                className="w-3 h-1.5 bg-primary-foreground rounded-l-full"
                style={{ animation: 'ribbon-wave 1s ease-in-out infinite 0.2s' }}
              />
            </div>
          </div>

          {/* Second rope segment */}
          <div
            className="w-4 h-0.5 bg-primary-foreground/60"
            style={{
              animation: stage >= 1 && stage < 3 ? 'rope-wave 1.5s ease-in-out infinite 0.2s' : 'none',
            }}
          />
        </div>

        {/* Truck icon (in front, pulling the banner) */}
        <Truck className="w-16 h-16 text-primary-foreground" />
      </div>

      {/* Tagline appears when truck stops */}
      <div
        className={`absolute bottom-1/3 transition-all duration-700 ${stage >= 2 && stage < 3
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
          }`}
      >
        <p className="text-primary-foreground/90 text-lg font-medium">
          Conectando o Brasil com logística inteligente
        </p>
      </div>

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary-foreground/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes banner-flutter {
          0%, 100% { transform: rotate(-1deg) translateY(0); }
          25% { transform: rotate(0.5deg) translateY(-2px); }
          50% { transform: rotate(1deg) translateY(0); }
          75% { transform: rotate(-0.5deg) translateY(2px); }
        }
        @keyframes rope-wave {
          0%, 100% { transform: scaleY(1) rotate(0deg); }
          50% { transform: scaleY(1.1) rotate(2deg); }
        }
        @keyframes ribbon-wave {
          0%, 100% { transform: translateX(0) scaleX(1); }
          50% { transform: translateX(-2px) scaleX(1.2); }
        }
      `}</style>
    </div>
  );
}
