export interface ChangelogSlide {
  title: string;
  description: string;
  image?: string;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  slides: ChangelogSlide[];
}

export const changelog: ChangelogRelease[] = [
  {
    version: "1.2.1",
    date: "2026-03-18",
    slides: [
      {
        title: "Correção: Visualização de Canhoto 🛠️",
        description: "Corrigido problema que impedia a visualização do canhoto (comprovante de entrega) anexado pelo motorista na carga.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-17",
    slides: [
      {
        title: "Financeiro Reformulado 💰",
        description: "O sistema financeiro foi completamente reestruturado: agora cada entrega finalizada gera um recebível individual com vencimento D+30, substituindo o modelo quinzenal anterior. Mais transparência e controle para todos.",
      },
      {
        title: "Calendário Financeiro",
        description: "Novo calendário visual nos portais de Embarcador e Transportadora com paginação, navegação por mês e detalhamento por dia. Embarcadores no modelo faturado visualizam faturas agrupadas com navegação entre meses.",
      },
      {
        title: "Configuração por Embarcador",
        description: "A Torre de Controle agora pode definir o tipo de pagamento (Pós-pago ou Faturado), prazos, dia de fechamento e limites de crédito individualmente por embarcador.",
      },
      {
        title: "Correções e Melhorias 🛠️",
        description: "• Corrigido bug que impedia a exibição de registros financeiros nos portais<br/>• Dados financeiros de entregas antigas recuperados e vinculados corretamente<br/>• Rastreamento público agora exibe origem e destino no mapa<br/>• Removidas referências ao sistema de faturas quinzenais descontinuado<br/>• E muitas outras melhorias de usabilidade!",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-10",
    slides: [
      {
        title: "Módulo Financeiro 💰",
        description: "Novo sistema financeiro completo com faturamento quinzenal automático, comissões configuráveis por empresa e visão detalhada de receitas e pagamentos.",
      },
      {
        title: "Faturas Automáticas",
        description: "As entregas finalizadas agora geram registros financeiros automaticamente, agrupados em faturas quinzenais (1ª e 2ª quinzena) para embarcadores e transportadoras.",
      },
      {
        title: "Painel Financeiro nos Portais",
        description: "Embarcadores e transportadoras agora possuem acesso ao painel financeiro com resumo de valores, histórico de faturas e detalhamento por entrega.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-04",
    slides: [
      {
        title: "Bem-vindo ao HubFrete! 🚀",
        description: "Sua plataforma completa de gestão logística está pronta. Gerencie cargas, entregas e frotas em um só lugar.",
        image: "/lovable-uploads/1dfa7a66-659b-462a-9f34-3366931d8935.png",
      },
      {
        title: "Operação Diária",
        description: "Acompanhe todas as entregas do dia com visão em tempo real, filtros inteligentes e ações rápidas.",
      },
      {
        title: "Rastreamento em tempo real",
        description: "Monitore seus motoristas e entregas no mapa com atualizações automáticas de localização.",
      },
    ],
  },
];

export const CURRENT_VERSION = changelog[0]?.version ?? "1.0.0";
