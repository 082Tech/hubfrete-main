

## Plano: Toast de Atualização PWA + Modal com Slideshow de Patch Notes

### O que será feito

1. **Toast de atualização disponível** — Quando o Service Worker detectar uma nova versão, aparece um toast no canto inferior direito com "Nova atualização disponível" e dois botões: "Atualizar agora" e "Dispensar". Se dispensar, reaparece no próximo carregamento de página.

2. **Modal com slideshow + notas** — Ao clicar "Atualizar agora", a página recarrega. Após recarregar, abre um modal com um carrossel de slides (imagem + texto) mostrando as novidades da versão. Você edita um único arquivo (`src/config/changelog.ts`) com os dados de cada release.

3. **Controle de versão vista** — Salva no `localStorage` a última versão vista pelo usuário, para não mostrar o modal de patch notes repetidamente.

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/config/changelog.ts` | **Criar** — Array de releases com versão, data, e slides (título, descrição, imagem opcional) |
| `src/hooks/useUpdatePrompt.ts` | **Criar** — Hook que escuta o evento `onNeedRefresh` do VitePWA e expõe estado `needRefresh` + função `updateApp` |
| `src/components/UpdateToast.tsx` | **Criar** — Componente que renderiza o toast fixo no canto inferior direito quando há atualização |
| `src/components/PatchNotesModal.tsx` | **Criar** — Modal com carrossel de slides das novidades da versão |
| `src/App.tsx` | **Editar** — Adicionar `<UpdateToast />` e `<PatchNotesModal />` |
| `vite.config.ts` | **Editar** — Mudar `registerType` de `"autoUpdate"` para `"prompt"` para permitir controle manual da atualização |

### Formato do changelog

```ts
// src/config/changelog.ts
export const changelog = [
  {
    version: "1.2.0",
    date: "2026-03-04",
    slides: [
      {
        title: "Nova tela de operação diária",
        description: "Agora você gerencia todas as entregas do dia em um só lugar.",
        image: "/lovable-uploads/exemplo.png" // opcional
      },
      {
        title: "Melhorias no rastreamento",
        description: "Mapa atualizado com rotas em tempo real.",
      }
    ]
  }
];
```

### Fluxo do usuário

```text
[Deploy novo] 
  → SW detecta nova versão
  → Toast aparece: "Nova atualização disponível 🚀"
     [Atualizar agora]  [Dispensar]
  
  → Clicou "Atualizar agora"
     → Página recarrega com versão nova
     → Modal de patch notes abre automaticamente
        ← Slideshow com setas/dots →
        [Entendi!] fecha o modal

  → Clicou "Dispensar"  
     → Toast some
     → Próximo carregamento: toast reaparece
```

### Detalhes técnicos

- **VitePWA prompt mode**: Troca `registerType: "autoUpdate"` para `"prompt"`, que expõe callbacks `onNeedRefresh` e `onOfflineReady` via `virtual:pwa-register/react`.
- **Toast**: Componente standalone com Framer Motion, não usa o sistema de toast do shadcn (para ter controle total do layout e persistência).
- **Modal**: Usa o `Dialog` do shadcn + `embla-carousel-react` (já instalado) para o slideshow.
- **localStorage keys**: `hubfrete-last-seen-version` para controlar exibição do modal.

