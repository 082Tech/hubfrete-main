import { useEffect, useState } from "react";

interface Orb {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

export function ImmersiveBackground() {
  const [orbs] = useState<Orb[]>(() => 
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      size: 300 + Math.random() * 400,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * -20,
    }))
  );

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 0% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.03) 0%, transparent 70%)
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
            background: `radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.08) 40%, transparent 70%)`,
            filter: 'blur(60px)',
            animationDuration: `${orb.duration}s`,
            animationDelay: `${orb.delay}s`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Extra glow spots */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full animate-pulse-slow"
        style={{
          top: '10%',
          left: '20%',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />
      <div 
        className="absolute w-[500px] h-[500px] rounded-full animate-pulse-slow"
        style={{
          bottom: '20%',
          right: '10%',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 60%)',
          filter: 'blur(70px)',
          animationDelay: '-5s',
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full animate-pulse-slow"
        style={{
          top: '50%',
          left: '60%',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 60%)',
          filter: 'blur(60px)',
          animationDelay: '-10s',
        }}
      />

      {/* Noise texture overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
