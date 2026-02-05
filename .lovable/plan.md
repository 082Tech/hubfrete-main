

# Plano: Registrar Eventos de Criação de Entrega na Timeline

## Visão Geral
Quando uma entrega é criada, atualmente não há nenhum evento registrado na timeline. O histórico só começa quando alguém muda o status manualmente. Este plano implementa o registro automático de dois eventos iniciais:

1. **"Entrega criada por Pessoa X"** - registro da criação
2. **"Status Aguardando"** - definido automaticamente pelo sistema

---

## O que será feito

### Para o usuário
- Ao abrir uma entrega recém-criada na tela de Gestão de Entregas, a timeline mostrará:
  - "Sistema definiu o status como Aguardando"
  - "Fulano criou esta entrega"
- Os eventos ficarão ordenados cronologicamente (mais recentes primeiro)

### Mudanças técnicas

#### 1. Atualização da Constraint do Banco de Dados
A constraint `entrega_eventos_tipo_check` precisa incluir um novo tipo: **`criado`**

Os tipos permitidos passarão a ser:
```
'criado', 'aceite', 'inicio_coleta', 'chegada_coleta', 'carregou', 
'inicio_rota', 'parada', 'chegada_destino', 'descarregou', 'finalizado', 
'problema', 'cancelado', 'desvio_rota', 'parada_prolongada', 
'velocidade_anormal', 'perda_sinal', 'recuperacao_sinal', 
'entrada_geofence', 'saida_geofence'
```

#### 2. Modificação do Fluxo de Criação de Entrega
No arquivo `CargasDisponiveis.tsx`, após criar a entrega com sucesso, inserir dois eventos:

```typescript
// Evento 1: Criação da entrega
await supabase.from('entrega_eventos').insert({
  entrega_id: entregaData.id,
  tipo: 'criado',
  timestamp: new Date().toISOString(),
  observacao: 'Entrega criada',
  user_id: user?.id ?? null,
  user_nome: profile?.nome_completo || user?.email || 'Sistema',
});

// Evento 2: Status inicial "Aguardando" pelo Sistema
await supabase.from('entrega_eventos').insert({
  entrega_id: entregaData.id,
  tipo: 'aceite',
  timestamp: new Date(Date.now() + 1).toISOString(), // +1ms para ordenação
  observacao: 'Status inicial definido automaticamente',
  user_id: null,
  user_nome: 'Sistema',
});
```

#### 3. Atualização da Timeline no Painel de Detalhes
No arquivo `OperacaoDiaria.tsx`, adicionar configuração visual para o novo tipo:

```typescript
const tipoConfig = {
  criado: { 
    label: 'Entrega criada', 
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    isCreation: true 
  },
  aceite: { label: 'Aguardando', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  // ... demais tipos
};
```

E ajustar a lógica de exibição para diferenciar:
- **Evento de criação**: "Fulano **criou esta entrega**"
- **Evento de status sistema**: "Sistema **definiu o status como** Aguardando"

#### 4. (Opcional) Preencher o campo `created_by`
O campo já existe na tabela `entregas` mas não está sendo utilizado. Aproveitaremos para preenchê-lo durante a criação:

```typescript
.insert({
  // ... outros campos
  created_by: user?.id ?? null,
})
```

---

## Arquivos a serem modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/portals/transportadora/CargasDisponiveis.tsx` | Inserir eventos de criação após criar entrega |
| `src/pages/portals/transportadora/OperacaoDiaria.tsx` | Adicionar tipo 'criado' na timeline com ícone e texto adequados |
| Nova migração SQL | Atualizar constraint para incluir tipo 'criado' |

---

## Resultado Esperado na Timeline

Ordenação (mais recente primeiro):
```
🔄 Sistema definiu o status como Aguardando
   05/02/2026 às 14:30

📝 Luis Sales criou esta entrega  
   05/02/2026 às 14:30
```

