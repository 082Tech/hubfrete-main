

# Frete Mínimo ANTT — Sugestão de preço por eixo na publicação

## O que muda na UX do modal

Reordena as abas do modal de Nova Oferta para deixar **Peso & Frete por último**, agora renomeada para **"Peso & Precificação"**. A ordem fica:

1. Dados
2. Requisitos (veículos/carrocerias)
3. Origem
4. Destino
5. **Peso & Precificação** (nova última etapa)

Na nova última etapa, baseado nos veículos selecionados em Requisitos e na distância calculada origem→destino, o sistema mostra **um card por grupo de eixos** com:

- Categoria (ex: "4 eixos — Truck", "6 eixos — Carreta", "9 eixos — Bitrem")
- Distância calculada (km via OSRM)
- **Piso ANTT calculado** (R$/km × km, e R$/ton equivalente baseado no peso)
- Input editável já preenchido com o piso (embarcador pode subir o valor, mas não descer)
- Badge verde quando ≥ piso, vermelha + bloqueio quando < piso

A oferta é publicada com **uma tabela de preços por categoria de eixos** em vez de um único `valor_frete_tonelada`. O motorista, ao aceitar, recebe automaticamente o valor correspondente ao seu veículo.

```text
┌── Peso & Precificação ──────────────────────────┐
│ Peso total: [____] kg    Distância: 487 km      │
│ Tipo de carga ANTT: Carga Geral (auto)          │
│                                                  │
│ ┌─ 2 eixos (VUC, 3/4) ───── Piso: R$ 1.842 ──┐  │
│ │ R$/ton sugerido: 92,10                      │  │
│ │ [ R$ 92,10 ] ✓ Atende piso ANTT            │  │
│ └────────────────────────────────────────────┘  │
│ ┌─ 3 eixos (Toco) ───────── Piso: R$ 2.156 ──┐  │
│ │ [ R$ 107,80 ] ✓                            │  │
│ └────────────────────────────────────────────┘  │
│ ┌─ 5 eixos (Carreta) ────── Piso: R$ 3.420 ──┐  │
│ │ [ R$ 171,00 ] ✓                            │  │
│ └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Backend / banco

**Tabela `antt_pisos`** (editável pelo admin na Torre):
- `id`, `categoria_carga` (geral, granel_solido, granel_liquido, frigorificada, perigosa, etc.)
- `numero_eixos` (2, 3, 4, 5, 6, 7, 9)
- `valor_por_km` (numeric) — coeficiente CCD (carga + deslocamento)
- `valor_por_km_carga_lotacao` (opcional, segundo coeficiente CC)
- `vigente_desde`, `ativo`
- RLS: leitura para qualquer authenticated; escrita só admin (`is_admin`)
- Seed inicial com Resolução ANTT vigente

**Tabela `carga_precos_eixo`** (preço por grupo de eixos da oferta):
- `id`, `carga_id` (FK), `numero_eixos`, `valor_por_tonelada`, `piso_antt_calculado`, `created_at`
- RLS: mesma da `cargas`

**Mapeamento tipo de carga → categoria ANTT** (helper TS, sem DB):
- `carga_seca/container/indivisivel` → `geral`
- `granel_solido` → `granel_solido`
- `granel_liquido` → `granel_liquido`
- `refrigerada/congelada` → `frigorificada`
- `perigosa` → `perigosa`
- `viva` → `granel_solido` (aproximação ANTT)

**Mapeamento veículo → nº de eixos** (helper TS):
- `vuc` → 2, `tres_quartos` → 2, `toco` → 3, `truck` → 3, `bitruck` → 4
- `carreta` → 5, `carreta_ls/vanderleia` → 6, `bitrem` → 7, `rodotrem` → 9

Veículos selecionados são agrupados por nº de eixos para gerar os cards.

**Trigger de validação no insert/update de `carga_precos_eixo`**: rejeita se `valor_por_tonelada × peso_ton < piso_antt_calculado` (hard block server-side).

## Aceite da carga

Em `accept_carga_tx` / `aceitar_carga_v8`: quando há `carga_precos_eixo`, busca o preço correspondente ao nº de eixos do veículo do motorista e usa esse valor para calcular `valor_frete` da entrega. Mantém compatibilidade com ofertas antigas (sem registros em `carga_precos_eixo` → usa `valor_frete_tonelada` como hoje).

## Admin (Torre)

Nova página **Torre → Configurações → Tabela ANTT** para listar/editar `antt_pisos` por categoria + nº de eixos, com data de vigência.

## Frontend — arquivos afetados

- `src/components/cargas/NovaCargaDialog.tsx` — reordena `TABS`, ajusta `validateCurrentTab`, troca aba Peso&Frete pelo novo componente
- **novo** `src/components/cargas/PesoPrecificacaoTab.tsx` — input de peso, cálculo de distância via `useOSRMRoute`, agrupamento por eixos, cards de piso, inputs validados
- **novo** `src/lib/antt.ts` — mapeamento veículo→eixos, tipo→categoria ANTT, função `calcularPisoMinimo({categoria, eixos, distanciaKm})`
- **novo** `src/hooks/useAnttPisos.ts` — fetch e cache da tabela `antt_pisos`
- `accept_carga_tx` / wizard de aceite — lê preço por eixo
- **nova rota admin** `src/pages/admin/TabelaANTT.tsx` + entrada na sidebar admin

## Resumo técnico

- Migration: cria `antt_pisos`, `carga_precos_eixo`, trigger de validação, seed ANTT, RLS
- Helpers TS para mapeamento e cálculo
- Reordenação de abas + nova aba final
- Cálculo de distância on-mount da última aba (OSRM já existe em `useOSRMRoute`)
- Hard block client + server quando preço < piso
- Aceite atualizado para resolver preço pelo nº de eixos do veículo
- Página admin para manutenção da tabela ANTT

