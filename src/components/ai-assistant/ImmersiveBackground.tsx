export function ImmersiveBackground() {
  return (
    <div className="immersive-bg">
      {/* Gradient orbs */}
      <div 
        className="bg-shape w-[600px] h-[600px] rounded-full -top-48 -left-48"
        style={{ background: 'hsl(var(--primary) / 0.15)' }}
      />
      <div 
        className="bg-shape w-[500px] h-[500px] rounded-full top-1/2 -right-32"
        style={{ background: 'hsl(var(--primary) / 0.1)' }}
      />
      <div 
        className="bg-shape w-[400px] h-[400px] rounded-full -bottom-32 left-1/4"
        style={{ background: 'hsl(var(--primary) / 0.08)' }}
      />
    </div>
  );
}
