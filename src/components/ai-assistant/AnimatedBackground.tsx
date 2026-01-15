import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];

    // Get computed CSS variable for particle color
    const getParticleColor = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      const particleColor = style.getPropertyValue('--ai-particle-color').trim() || '152 76% 45%';
      return particleColor;
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update(canvasWidth: number, canvasHeight: number) {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvasWidth) this.x = 0;
        if (this.x < 0) this.x = canvasWidth;
        if (this.y > canvasHeight) this.y = 0;
        if (this.y < 0) this.y = canvasHeight;
      }

      draw(ctx: CanvasRenderingContext2D, particleColor: string) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particleColor}, ${this.opacity})`;
        ctx.fill();
      }
    }

    function init() {
      particles = [];
      const particleCount = Math.floor((canvas!.width * canvas!.height) / 15000);
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas!.width, canvas!.height));
      }
    }

    function connectParticles(ctx: CanvasRenderingContext2D, particleColor: string) {
      const maxDistance = 150;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `hsla(${particleColor}, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      const particleColor = getParticleColor();
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      particles.forEach((particle) => {
        particle.update(canvas!.width, canvas!.height);
        particle.draw(ctx!, particleColor);
      });

      connectParticles(ctx!, particleColor);
      animationId = requestAnimationFrame(animate);
    }

    function resize() {
      const parent = canvas!.parentElement;
      canvas!.width = parent?.clientWidth || window.innerWidth;
      canvas!.height = parent?.clientHeight || window.innerHeight;
      init();
    }

    resize();
    animate();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient overlays using CSS variables */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, hsl(var(--ai-bg-gradient-1)) 0%, hsl(var(--ai-bg-gradient-2)) 50%, hsl(var(--ai-bg-gradient-3)) 100%)"
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, hsl(var(--ai-accent) / 0.15), transparent 60%)"
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 80% 80%, hsl(var(--ai-accent-glow) / 0.1), transparent 50%)"
        }}
      />
      
      {/* Floating orbs */}
      <div 
        className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-float" 
        style={{ backgroundColor: 'hsl(var(--ai-accent) / var(--ai-orb-opacity))' }}
      />
      <div 
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-float" 
        style={{ backgroundColor: 'hsl(var(--ai-accent-glow) / calc(var(--ai-orb-opacity) * 0.75))', animationDelay: '-3s' }}
      />
      <div 
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl animate-pulse-slow" 
        style={{ backgroundColor: 'hsl(var(--ai-accent) / calc(var(--ai-orb-opacity) * 0.5))' }}
      />
      
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />
    </div>
  );
}
