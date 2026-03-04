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
