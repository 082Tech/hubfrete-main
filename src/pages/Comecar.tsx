import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Truck, Smartphone, ArrowLeft, ArrowRight, Building2, CheckCircle } from 'lucide-react';

const profiles = [
  {
    id: 'embarcador',
    title: 'Embarcador',
    subtitle: 'Fábricas, distribuidores e varejistas',
    description: 'Publique ofertas de carga, encontre transportadores verificados e acompanhe suas entregas em tempo real.',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200 hover:border-blue-400',
    link: '/cadastro/embarcador',
    features: ['Publicar ofertas de carga', 'Rastreamento em tempo real', 'Gestão financeira D+0'],
  },
  {
    id: 'transportadora',
    title: 'Transportadora',
    subtitle: 'Transportadoras e frotas',
    description: 'Gerencie sua frota, motoristas e carrocerias. Aceite cargas e controle toda a operação.',
    icon: Truck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200 hover:border-emerald-400',
    link: '/cadastro/transportadora',
    features: ['Gestão de frota completa', 'Controle de motoristas', 'Financeiro integrado'],
  },
  {
    id: 'motorista',
    title: 'Motorista',
    subtitle: 'Motoristas autônomos',
    description: 'Baixe o aplicativo HubFrete para encontrar fretes, gerenciar suas viagens e receber pagamentos.',
    icon: Smartphone,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200 hover:border-amber-400',
    link: null, // links to app
    features: ['Encontrar fretes disponíveis', 'Rastreamento GPS automático', 'Pagamento rápido'],
  },
];

export default function Comecar() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <p className="text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16 max-w-5xl">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Como você quer usar o HubFrete?
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Escolha seu perfil para criar sua conta e começar a usar a plataforma.
          </p>
        </motion.div>

        {/* Profile Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {profiles.map((profile, i) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
            >
              <button
                onClick={() => {
                  if (profile.link) {
                    navigate(profile.link);
                  } else {
                    // Motorista → show app download info
                    window.open('https://play.google.com/store/apps/details?id=com.hubfrete.app', '_blank');
                  }
                }}
                className={`w-full text-left rounded-2xl border-2 ${profile.border} bg-card p-6 transition-all duration-200 hover:shadow-lg group active:scale-[0.98]`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl ${profile.bg} flex items-center justify-center mb-5`}>
                  <profile.icon className={`w-7 h-7 ${profile.color}`} />
                </div>

                {/* Content */}
                <h2 className="text-xl font-semibold mb-1">{profile.title}</h2>
                <p className="text-sm text-muted-foreground mb-3">{profile.subtitle}</p>
                <p className="text-sm text-foreground/80 mb-5 leading-relaxed">{profile.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {profile.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className={`w-4 h-4 ${profile.color} shrink-0`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`flex items-center gap-2 text-sm font-medium ${profile.color} group-hover:gap-3 transition-all`}>
                  {profile.link ? 'Criar conta' : 'Baixar aplicativo'}
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}