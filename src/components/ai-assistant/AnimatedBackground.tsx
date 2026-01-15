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

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(152, 76%, 45%, ${this.opacity})`;
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

    function connectParticles(ctx: CanvasRenderingContext2D) {
      const maxDistance = 150;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `hsla(152, 76%, 45%, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      particles.forEach((particle) => {
        particle.update(canvas!.width, canvas!.height);
        particle.draw(ctx!);
      });

      connectParticles(ctx!);
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
      {/* Gradient overlays - teal/green base with more brightness */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0f1716 0%, #0d1f1a 50%, #0a1914 100%)"
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(45, 212, 191, 0.15), transparent 60%)"
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 80% 80%, rgba(20, 184, 166, 0.1), transparent 50%)"
        }}
      />
      
      {/* Floating orbs with teal colors */}
      <div 
        className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-float" 
        style={{ backgroundColor: 'rgba(45, 212, 191, 0.08)' }}
      />
      <div 
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-float" 
        style={{ backgroundColor: 'rgba(20, 184, 166, 0.06)', animationDelay: '-3s' }}
      />
      <div 
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl animate-pulse-slow" 
        style={{ backgroundColor: 'rgba(45, 212, 191, 0.04)' }}
      />
      
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />
    </div>
  );
}
