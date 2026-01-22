import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Truck, MapPin } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Animated floating elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute inset-0 pointer-events-none"
      >
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-1/4 left-1/4 hidden md:block"
        >
          <div className="p-4 rounded-2xl bg-card/50 border border-border/30 backdrop-blur-sm">
            <Truck className="w-8 h-8 text-primary/40" />
          </div>
        </motion.div>
        
        <motion.div
          animate={{ 
            y: [0, 15, 0],
            rotate: [0, -3, 0]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-1/3 right-1/4 hidden md:block"
        >
          <div className="p-4 rounded-2xl bg-card/50 border border-border/30 backdrop-blur-sm">
            <MapPin className="w-8 h-8 text-muted-foreground/30" />
          </div>
        </motion.div>
      </motion.div>

      <div className="relative z-10 text-center max-w-lg">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-[120px] sm:text-[160px] lg:text-[200px] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-primary via-primary/80 to-primary/30">
            404
          </h1>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-2"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-md mx-auto">
            Parece que essa rota não existe. A página que você está procurando pode ter sido movida ou removida.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            size="lg"
            onClick={() => navigate('/')}
            className="rounded-full px-6 h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Home className="w-4 h-4" />
            Ir para o Início
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate(-1)}
            className="rounded-full px-6 h-12 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </motion.div>

        {/* Path info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-xs text-muted-foreground/60 font-mono"
        >
          Rota: {location.pathname}
        </motion.p>
      </div>
    </div>
  );
};

export default NotFound;
