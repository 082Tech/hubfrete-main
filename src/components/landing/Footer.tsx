import { Link } from 'react-router-dom';
import { Truck, Mail, Phone, MapPin, Linkedin, Instagram, Facebook } from 'lucide-react';

export function Footer() {
  return (
    <footer id="contato" className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16 pb-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Hub<span className="text-primary">Frete</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Conectando o Brazil com logística inteligente. Marketplace que une 
              fábricas, distribuidores e transportadoras.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 bg-accent rounded-lg hover:bg-primary/10 transition-colors">
                <Linkedin className="w-4 h-4 text-accent-foreground" />
              </a>
              <a href="#" className="p-2 bg-accent rounded-lg hover:bg-primary/10 transition-colors">
                <Instagram className="w-4 h-4 text-accent-foreground" />
              </a>
              <a href="#" className="p-2 bg-accent rounded-lg hover:bg-primary/10 transition-colors">
                <Facebook className="w-4 h-4 text-accent-foreground" />
              </a>
            </div>
          </div>
          
          {/* Para Empresas */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Para Empresas</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Como Funciona</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Monitor de Cargas</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Módulo Financeiro</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Dashboard Executivo</a></li>
            </ul>
          </div>
          
          {/* Para Motoristas */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Para Motoristas</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Carteira Digital</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Antecipação D+0</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Clube de Vantagens</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary text-sm">Baixar App</a></li>
            </ul>
          </div>
          
          {/* Contato */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-primary" />
                contato@hubfrete.com
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-primary" />
                (11) 99999-9999
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                São Paulo, SP - Brazil
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 HubFrete. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground hover:text-primary text-sm">Termos de Uso</a>
            <a href="#" className="text-muted-foreground hover:text-primary text-sm">Privacidade</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
