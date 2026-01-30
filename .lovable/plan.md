
# Plano: Atualização do Nome da Tabela de Localizações

## Resumo da Mudança

Você renomeou a tabela do banco de dados de `localizações` para `localizacoes` (removendo o cedilha). Agora precisamos atualizar todas as referências no código para refletir esse novo nome.

---

## Arquivos que Precisam ser Alterados

### 1. `src/hooks/useRealtimeLocalizacoes.ts`

**Mudanças:**
- **Linha 48**: Trocar `'localizações'` por `'localizacoes'` na query
- **Linha 99**: Trocar `'localizações'` por `'localizacoes'` na subscription Realtime
- **Remover workaround**: Com o nome sem caracteres especiais, podemos remover o `(supabase as any)` e usar a tipagem correta do Supabase

```typescript
// Antes (linha 47-50):
const { data, error } = await (supabase as any)
  .from('localizações')
  .select('*')

// Depois:
const { data, error } = await supabase
  .from('localizacoes')
  .select('*')
```

```typescript
// Antes (linha 98-100):
schema: 'public',
table: 'localizações',

// Depois:
schema: 'public',
table: 'localizacoes',
```

---

### 2. `src/pages/admin/Monitoramento.tsx`

**Mudanças:**
- **Linha 117-120**: Trocar `'localizações'` por `'localizacoes'` na query
- **Remover workaround**: Remover o `(supabase as any)` e usar tipagem correta

```typescript
// Antes (linha 117-120):
const { data: locations } = await (supabase as any)
  .from('localizações')
  .select('*')

// Depois:
const { data: locations } = await supabase
  .from('localizacoes')
  .select('*')
```

---

### 3. `src/integrations/supabase/types.ts`

**Mudança:**
- **Linha 1371**: Atualizar o `foreignKeyName` de `"localizações_motorista_id_fkey"` para `"localizacoes_motorista_id_fkey"`

> **Nota**: Esta mudança só deve ser feita se você também renomeou a foreign key no banco. Se a FK ainda tem o nome antigo no banco, esse valor precisa corresponder ao nome real da constraint.

---

## Resumo das Alterações

| Arquivo | Linha(s) | Alteração |
|---------|----------|-----------|
| `useRealtimeLocalizacoes.ts` | 47-50 | `.from('localizações')` → `.from('localizacoes')` |
| `useRealtimeLocalizacoes.ts` | 47 | Remover `(supabase as any)` - usar tipagem correta |
| `useRealtimeLocalizacoes.ts` | 99 | `table: 'localizações'` → `table: 'localizacoes'` |
| `Monitoramento.tsx` | 117-120 | `.from('localizações')` → `.from('localizacoes')` |
| `Monitoramento.tsx` | 117 | Remover `(supabase as any)` - usar tipagem correta |
| `types.ts` | 1371 | `foreignKeyName` (se a FK foi renomeada no banco) |

---

## Benefícios da Mudança

1. **Sem workarounds**: Podemos remover os `(supabase as any)` que eram necessários por causa do cedilha
2. **Tipagem completa**: O TypeScript agora pode inferir corretamente os tipos da tabela
3. **Compatibilidade**: Evita problemas de encoding em diferentes ambientes

---

## Observações

- A lógica de rastreamento **não será alterada** - apenas os nomes das referências
- O hook `useRealtimeLocalizacoes` continuará funcionando normalmente
- As páginas de Monitoramento (admin) e Gestão de Cargas/Entregas (portais) continuarão usando o hook que será atualizado
