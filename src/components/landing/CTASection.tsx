import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Truck, ArrowRight } from 'lucide-react';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10">
          <Truck className="w-32 h-32 text-primary-foreground" />
        </div>
        <div className="absolute bottom-10 right-10">
          <Truck className="w-48 h-48 text-primary-foreground transform -scale-x-100" />
        </div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Pronto para transformar sua logística?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Junte-se a milhares de empresas e motoristas que já fazem parte da maior 
            rede de logística do Brasil.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="gap-2 text-lg px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => navigate('/login')}
            >
              Começar Gratuitamente
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2 text-lg px-8 border-primary-foreground text-primary hover:bg-primary-foreground/10 hover:text-white"
              onClick={() => navigate('/login')}
            >
              Falar com Especialista
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
