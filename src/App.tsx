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
import { PortalLayoutWrapper } from "@/components/portals/PortalLayoutWrapper";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AdminLogin from "./pages/admin/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TorreControle from "./pages/admin/TorreControle";
import PreCadastros from "./pages/admin/PreCadastros";
import Usuarios from "./pages/admin/Usuarios";
import Monitoramento from "./pages/admin/Monitoramento";
import AdminRelatorios from "./pages/admin/Relatorios";
import PerformanceKPIs from "./pages/admin/PerformanceKPIs";
import DocumentosValidacao from "./pages/admin/DocumentosValidacao";
import Chamados from "./pages/admin/Chamados";
import Empresas from "./pages/admin/Empresas";
import MotoristasAdmin from "./pages/admin/MotoristasAdmin";
import VeiculosAdmin from "./pages/admin/VeiculosAdmin";
import CargasAdmin from "./pages/admin/CargasAdmin";
import CargasHistoricoAdmin from "./pages/admin/CargasHistoricoAdmin";
import EntregasAdmin from "./pages/admin/EntregasAdmin";
import Logs from "./pages/admin/Logs";
import { AdminLayoutWrapper } from "./components/admin/AdminLayoutWrapper";
import CadastroMotorista from "./pages/CadastroMotorista";
import CadastroMotoristaConvite from "./pages/CadastroMotoristaConvite";
import CadastroEmbarcador from "./pages/CadastroEmbarcador";
import CadastroTransportadora from "./pages/CadastroTransportadora";
import PreCadastroEmbarcador from "./pages/PreCadastroEmbarcador";
import PreCadastroTransportadora from "./pages/PreCadastroTransportadora";
import PreCadastroMotorista from "./pages/PreCadastroMotorista";
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
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/esqueci-senha" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* Admin Portal - Nested routes with shared layout */}
                <Route path="/admin" element={<AdminLayoutWrapper />}>
                  <Route path="torre-controle" element={<TorreControle />} />
                  <Route path="pre-cadastros" element={<PreCadastros />} />
                  <Route path="usuarios" element={<Usuarios />} />
                  <Route path="monitoramento" element={<Monitoramento />} />
                  <Route path="relatorios" element={<AdminRelatorios />} />
                  <Route path="performance" element={<PerformanceKPIs />} />
                  <Route path="documentos" element={<DocumentosValidacao />} />
                  <Route path="chamados" element={<Chamados />} />
                  <Route path="empresas" element={<Empresas />} />
                  <Route path="motoristas" element={<MotoristasAdmin />} />
                  <Route path="veiculos" element={<VeiculosAdmin />} />
                  <Route path="cargas" element={<CargasAdmin />} />
                  <Route path="cargas/historico" element={<CargasHistoricoAdmin />} />
                  <Route path="entregas" element={<EntregasAdmin />} />
                  <Route path="logs" element={<Logs />} />
                </Route>
                <Route path="/cadastro/motorista" element={<CadastroMotorista />} />
                <Route path="/cadastro/motorista/convite" element={<CadastroMotoristaConvite />} />
                <Route path="/cadastro/motorista/convite/:linkId" element={<CadastroMotoristaConvite />} />
                <Route path="/cadastro/embarcador" element={<CadastroEmbarcador />} />
                <Route path="/cadastro/transportadora" element={<CadastroTransportadora />} />
                
                {/* Pré-cadastros públicos */}
                <Route path="/pre-cadastro/embarcador" element={<PreCadastroEmbarcador />} />
                <Route path="/pre-cadastro/transportadora" element={<PreCadastroTransportadora />} />
                <Route path="/pre-cadastro/motorista" element={<PreCadastroMotorista />} />
                
                {/* Portal Embarcador - Nested routes with shared layout */}
                <Route path="/embarcador" element={<PortalLayoutWrapper expectedUserType="embarcador" />}>
                  <Route index element={<EmbarcadorDashboard />} />
                  <Route path="cargas" element={<CargasPublicadas />} />
                  <Route path="cargas/em-rota" element={<CargasEmRota />} />
                  <Route path="cargas/historico" element={<HistoricoCargas />} />
                  <Route path="relatorios" element={<Relatorios />} />
                  <Route path="assistente" element={<Assistente />} />
                  <Route path="mensagens" element={<EmbarcadorMensagens />} />
                  <Route path="contatos" element={<ContatosSalvos />} />
                  <Route path="notificacoes" element={<EmbarcadorNotificacoes />} />
                  <Route path="filiais" element={<GerenciarFiliais />} />
                  <Route path="usuarios" element={<UsuariosEmpresa />} />
                  <Route path="configuracoes" element={<Configuracoes />} />
                </Route>
                
                {/* Portal Transportadora - Nested routes with shared layout */}
                <Route path="/transportadora" element={<PortalLayoutWrapper expectedUserType="transportadora" />}>
                  <Route index element={<TransportadoraDashboard />} />
                  <Route path="cargas" element={<TransportadoraCargas />} />
                  <Route path="frota" element={<TransportadoraFrota />} />
                  <Route path="motoristas" element={<TransportadoraMotoristas />} />
                  <Route path="entregas" element={<TransportadoraGestaoEntregas />} />
                  <Route path="entregas/historico" element={<TransportadoraHistoricoEntregas />} />
                  <Route path="relatorios" element={<TransportadoraRelatorios />} />
                  <Route path="assistente" element={<TransportadoraAssistente />} />
                  <Route path="mensagens" element={<TransportadoraMensagens />} />
                  <Route path="notificacoes" element={<TransportadoraNotificacoes />} />
                  <Route path="filiais" element={<TransportadoraFiliais />} />
                  <Route path="usuarios" element={<TransportadoraUsuarios />} />
                  <Route path="configuracoes" element={<TransportadoraConfiguracoes />} />
                </Route>
                
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
