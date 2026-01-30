

# Plano: Centralizar a Animação de Boas-Vindas no Chat

## Problema Identificado

A animação `WelcomeAnimation` está posicionada com `absolute inset-0`, mas o container pai (`<div className="absolute inset-0 z-50">`) ocupa toda a tela, incluindo a sidebar do histórico no desktop. Isso faz com que a animação pareça deslocada para a esquerda do centro real da área de chat.

## Solução

Mover o componente `WelcomeAnimation` para dentro da área principal do chat (onde as mensagens são exibidas), ao invés de posicioná-lo como overlay de toda a tela.

## Mudanças Técnicas

### Arquivo: `src/pages/portals/embarcador/Assistente.tsx`

1. **Remover** o container wrapper `<div className="absolute inset-0 z-50">` que envolve a animação
2. **Mover** o `WelcomeAnimation` para dentro da área de mensagens (`<div ref={messagesScrollRef}>`)
3. **Renderizar condicionalmente**: quando `showWelcomeAnimation` for true, mostrar a animação ao invés das mensagens

```text
Antes:
┌────────────────────────────────────────────┐
│  Container Principal (toda a tela)         │
│  ┌──────────────────────────────────────┐  │
│  │  WelcomeAnimation (absolute inset-0) │  │  ← Centralizado aqui (errado)
│  └──────────────────────────────────────┘  │
│  ┌─────────────────────────┬────────────┐  │
│  │   Área do Chat          │  Sidebar   │  │
│  └─────────────────────────┴────────────┘  │
└────────────────────────────────────────────┘

Depois:
┌────────────────────────────────────────────┐
│  Container Principal                        │
│  ┌─────────────────────────┬────────────┐  │
│  │   Área do Chat          │  Sidebar   │  │
│  │  ┌───────────────────┐  │            │  │
│  │  │ WelcomeAnimation  │  │            │  │  ← Centralizado aqui (correto)
│  │  └───────────────────┘  │            │  │
│  └─────────────────────────┴────────────┘  │
└────────────────────────────────────────────┘
```

### Mudanças Específicas

**Linha ~302-311 (remover):**
```tsx
// REMOVER este bloco do local atual
<AnimatePresence mode="wait">
  {showWelcomeAnimation && (
    <div className="absolute inset-0 z-50">
      <WelcomeAnimation 
        userName={fullName} 
        onComplete={handleWelcomeComplete} 
      />
    </div>
  )}
</AnimatePresence>
```

**Linha ~374-392 (modificar a área de mensagens):**
```tsx
<div
  ref={messagesScrollRef}
  onScroll={handleMessagesScroll}
  className={`flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none relative ${isMobile ? 'pt-16 pb-2 px-4' : 'py-6 px-6'}`}
  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
>
  {/* Welcome Animation - dentro da área do chat */}
  <AnimatePresence mode="wait">
    {showWelcomeAnimation && (
      <WelcomeAnimation 
        userName={fullName} 
        onComplete={handleWelcomeComplete} 
      />
    )}
  </AnimatePresence>
  
  {/* Mensagens - só aparecem depois da animação */}
  {!showWelcomeAnimation && (
    <div className="max-w-3xl mx-auto space-y-6">
      {messages.map((message) => (
        <ChatMessage 
          key={message.id} 
          message={message} 
          userName={fullName}
          userInitials={userInitials}
        />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  )}
</div>
```

### Arquivo: `src/components/ai-assistant/WelcomeAnimation.tsx`

O componente já usa `absolute inset-0` com `flex items-center justify-center`, o que é correto. Nenhuma mudança necessária no componente em si.

## Resultado Esperado

- A animação ficará centralizada exatamente no meio da área de chat
- No desktop, a sidebar de histórico não afetará o posicionamento
- No mobile, a animação respeitará a barra de navegação inferior
- Transição suave entre a animação e as mensagens do chat

