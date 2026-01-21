import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { UserContextProvider } from "@/hooks/useUserContext";
import { SplashScreen } from "@/components/SplashScreen";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AdminLogin from "./pages/admin/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TorreControle from "./pages/admin/TorreControle";
import Usuarios from "./pages/admin/Usuarios";
import CadastroMotorista from "./pages/CadastroMotorista";
import CadastroEmbarcador from "./pages/CadastroEmbarcador";
import CadastroTransportadora from "./pages/CadastroTransportadora";
import EmbarcadorDashboard from "./pages/portals/EmbarcadorDashboard";
import CargasPublicadas from "./pages/portals/embarcador/CargasPublicadas";
import CargasEmRota from "./pages/portals/embarcador/GestaoCargas";
import HistoricoCargas from "./pages/portals/embarcador/HistoricoCargas";
import Relatorios from "./pages/portals/embarcador/Relatorios";
import Configuracoes from "./pages/portals/embarcador/Configuracoes";
import GerenciarFiliais from "./pages/portals/embarcador/GerenciarFiliais";
import UsuariosEmpresa from "./pages/portals/embarcador/UsuariosEmpresa";
import Assistente from "./pages/portals/embarcador/Assistente";
import ContatosSalvos from "./pages/portals/embarcador/ContatosSalvos";
import EmbarcadorMensagens from "./pages/portals/embarcador/Mensagens";
import EmbarcadorNotificacoes from "./pages/portals/embarcador/Notificacoes";

import TransportadoraDashboard from "./pages/portals/TransportadoraDashboard";
import TransportadoraCargas from "./pages/portals/transportadora/CargasDisponiveis";
import TransportadoraFrota from "./pages/portals/transportadora/MinhaFrota";
import TransportadoraMotoristas from "./pages/portals/transportadora/Motoristas";
import TransportadoraGestaoEntregas from "./pages/portals/transportadora/GestaoEntregas";
import TransportadoraHistoricoEntregas from "./pages/portals/transportadora/HistoricoEntregas";
import TransportadoraAssistente from "./pages/portals/transportadora/Assistente";
import TransportadoraConfiguracoes from "./pages/portals/transportadora/Configuracoes";
import TransportadoraFiliais from "./pages/portals/transportadora/GerenciarFiliais";
import TransportadoraUsuarios from "./pages/portals/transportadora/UsuariosEmpresa";
import TransportadoraMensagens from "./pages/portals/transportadora/Mensagens";
import TransportadoraRelatorios from "./pages/portals/transportadora/Relatorios";
import TransportadoraNotificacoes from "./pages/portals/transportadora/Notificacoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetch when switching tabs
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    },
  },
});

const App = () => {
  const [showSplash, setShowSplash] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <AuthProvider>
            <UserContextProvider>
              <Toaster />
              <Sonner />
              {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login setShowSplash={setShowSplash} />} />
                <Route path="/admin" element={<AdminLogin setShowSplash={setShowSplash} />} />
                <Route path="/esqueci-senha" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin/torre-controle" element={<TorreControle />} />
                <Route path="/admin/usuarios" element={<Usuarios />} />
                <Route path="/cadastro/motorista" element={<CadastroMotorista />} />
                <Route path="/cadastro/embarcador" element={<CadastroEmbarcador />} />
                <Route path="/cadastro/transportadora" element={<CadastroTransportadora />} />
                
                {/* Portal Embarcador */}
                <Route path="/embarcador" element={<EmbarcadorDashboard />} />
                <Route path="/embarcador/cargas" element={<CargasPublicadas />} />
                <Route path="/embarcador/cargas/em-rota" element={<CargasEmRota />} />
                <Route path="/embarcador/cargas/historico" element={<HistoricoCargas />} />
                <Route path="/embarcador/relatorios" element={<Relatorios />} />
                <Route path="/embarcador/assistente" element={<Assistente />} />
                <Route path="/embarcador/mensagens" element={<EmbarcadorMensagens />} />
                <Route path="/embarcador/contatos" element={<ContatosSalvos />} />
                <Route path="/embarcador/notificacoes" element={<EmbarcadorNotificacoes />} />
                
                <Route path="/embarcador/filiais" element={<GerenciarFiliais />} />
                <Route path="/embarcador/usuarios" element={<UsuariosEmpresa />} />
                <Route path="/embarcador/configuracoes" element={<Configuracoes />} />
                
                {/* Portal Transportadora */}
                <Route path="/transportadora" element={<TransportadoraDashboard />} />
                <Route path="/transportadora/cargas" element={<TransportadoraCargas />} />
                <Route path="/transportadora/frota" element={<TransportadoraFrota />} />
                <Route path="/transportadora/motoristas" element={<TransportadoraMotoristas />} />
                <Route path="/transportadora/entregas" element={<TransportadoraGestaoEntregas />} />
                <Route path="/transportadora/entregas/historico" element={<TransportadoraHistoricoEntregas />} />
                <Route path="/transportadora/relatorios" element={<TransportadoraRelatorios />} />
                <Route path="/transportadora/assistente" element={<TransportadoraAssistente />} />
                <Route path="/transportadora/mensagens" element={<TransportadoraMensagens />} />
                <Route path="/transportadora/notificacoes" element={<TransportadoraNotificacoes />} />
                <Route path="/transportadora/filiais" element={<TransportadoraFiliais />} />
                <Route path="/transportadora/usuarios" element={<TransportadoraUsuarios />} />
                <Route path="/transportadora/configuracoes" element={<TransportadoraConfiguracoes />} />
                
                {/* Portal Motorista: removido do site (apenas app) */}
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </UserContextProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
};

export default App;
