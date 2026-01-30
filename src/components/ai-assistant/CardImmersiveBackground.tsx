import { useState } from "react";

interface Orb {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

export function CardImmersiveBackground() {
  const [orbs] = useState<Orb[]>(() => 
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      size: 100 + Math.random() * 150,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 15 + Math.random() * 10,
      delay: Math.random() * -10,
    }))
  );

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-xl pointer-events-none">
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 0% 0%, hsl(var(--primary) / 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.05) 0%, transparent 70%)
          `
        }}
      />

      {/* Animated orbs */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className="absolute rounded-full animate-float-orb"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.1) 40%, transparent 70%)`,
            filter: 'blur(40px)',
            animationDuration: `${orb.duration}s`,
            animationDelay: `${orb.delay}s`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Extra glow spot */}
      <div 
        className="absolute w-[200px] h-[200px] rounded-full animate-pulse-slow"
        style={{
          top: '20%',
          right: '10%',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 60%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Noise texture overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
