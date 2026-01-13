import iphone17 from "@/assets/iphone17.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-hero">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-semibold">Apple</span>
          <div className="flex items-center gap-8">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              iPhone 17
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Especificações
            </a>
            <button className="px-4 py-2 text-sm bg-accent text-accent-foreground rounded-full hover:opacity-90 transition-opacity">
              Comprar
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        <div className="text-center mb-8 animate-fade-up">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-4">
            iPhone 17
          </h1>
          <p className="text-2xl md:text-3xl text-gradient font-medium mb-2">
            O futuro chegou.
          </p>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Chip A19 Pro. Câmera revolucionária de 200MP. Tela ProMotion de 240Hz.
          </p>
        </div>

        <div className="relative animate-fade-up-delay">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(210_100%_50%_/_0.2)_0%,_transparent_70%)] blur-3xl scale-150" />
          <img
            src={iphone17}
            alt="iPhone 17"
            className="relative z-10 w-[280px] md:w-[350px] animate-float"
          />
        </div>

        <div className="flex gap-4 mt-12 animate-fade-up-delay-2">
          <button className="px-8 py-3 bg-accent text-accent-foreground rounded-full font-medium hover:opacity-90 transition-opacity">
            Saiba Mais
          </button>
          <button className="px-8 py-3 bg-secondary text-secondary-foreground rounded-full font-medium hover:bg-muted transition-colors">
            Comprar
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="text-5xl font-bold text-accent mb-2">A19 Pro</div>
              <p className="text-muted-foreground">O chip mais poderoso do mundo</p>
            </div>
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="text-5xl font-bold text-accent mb-2">200MP</div>
              <p className="text-muted-foreground">Câmera principal revolucionária</p>
            </div>
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="text-5xl font-bold text-accent mb-2">240Hz</div>
              <p className="text-muted-foreground">Tela ProMotion ultra fluida</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
