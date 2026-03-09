

# Plan: Commission System for HubFrete

## Overview

Add a per-shipper (embarcador) commission percentage that HubFrete charges on freight. This commission is configured in the admin Torre de Controle, stored in the database, and transparently shown to carriers/drivers when browsing and accepting loads.

## Database Changes

### 1. Add `comissao_hubfrete_percent` column to `empresas` table

```sql
ALTER TABLE public.empresas
ADD COLUMN comissao_hubfrete_percent NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN public.empresas.comissao_hubfrete_percent IS 
  'Percentage commission HubFrete takes from freight on loads published by this shipper (0-100)';
```

This is the simplest approach: one column on the existing `empresas` table. Only relevant for `tipo = 'EMBARCADOR'` companies. Default 0 means no commission.

## Admin - Torre de Controle (Empresas page)

### 2. Edit Company Dialog: Add commission field

In `src/pages/admin/Empresas.tsx`:
- Add a `comissao_hubfrete_percent` field to the create/edit form (only visible when `tipo === 'EMBARCADOR'`).
- Use a numeric input with `%` suffix, min 0, max 100, step 0.01.
- Display commission in the expanded company row for embarcadores.
- Fetch and save the new column.

## Carrier Portal - Ofertas Disponiveis

### 3. Fetch commission and apply to displayed freight values

In `src/pages/portals/transportadora/OfertasDisponiveis.tsx`:

- The query already fetches `empresa` data. Add fetching `comissao_hubfrete_percent` from the carga's `empresa_id` (join through `cargas.empresa_id → empresas`).
- Create a helper: `calcularFreteLiquido(freteTotal, comissaoPercent)` = `freteTotal * (1 - comissaoPercent / 100)`, rounded to 2 decimals.
- **Card view (`CargaCard`)**: Show the **net value** (after commission) as the main freight value. No extra label needed on cards — keep it clean.
- **Accept wizard (Step 3 - Review)**: In the "Frete a Receber" section, show a breakdown:
  - Valor do frete: R$ 3.000,00
  - Comissão HubFrete (10%): - R$ 300,00
  - **Valor líquido: R$ 2.700,00** (highlighted)
- The value passed to `accept_carga_tx` / `aceitar_carga_v8` (`p_valor_frete`) should remain the **gross freight value** (full amount). The commission is informational for display; the actual financial settlement will be handled in the future financial module.

### 4. Carrier Portal - Other views

In `OperacaoDiaria.tsx`, `HistoricoEntregas.tsx`, `Relatorios.tsx`:
- These display `valor_frete` from the `entregas` table (already the gross value stored at acceptance time).
- For now, no changes needed here — the financial module will handle net vs gross distinction later.

## Shipper Portal - Transparency

### 5. Embarcador views

In `src/pages/portals/embarcador/GestaoCargas.tsx` and `HistoricoCargas.tsx`:
- When displaying freight values on deliveries, add a subtle info tooltip or note showing "Inclui comissão HubFrete de X%" so the shipper is aware.
- Fetch the company's own `comissao_hubfrete_percent` from the user context or a single query.

## Summary of Files to Change

| File | Change |
|------|--------|
| **Migration SQL** | Add `comissao_hubfrete_percent` to `empresas` |
| `src/pages/admin/Empresas.tsx` | Commission field in create/edit dialog + display in table |
| `src/pages/portals/transportadora/OfertasDisponiveis.tsx` | Fetch commission, show net freight on cards and breakdown in wizard |
| `src/pages/portals/embarcador/GestaoCargas.tsx` | Tooltip showing commission info on freight values |
| `src/pages/portals/embarcador/HistoricoCargas.tsx` | Same tooltip for historical view |

## Key Decisions

- **Gross value stored in DB**: `entregas.valor_frete` always stores the full gross freight. Commission is applied at display time only.
- **Commission per embarcador**: Each shipper company has its own negotiated rate. Carriers see the net amount.
- **No commission on the carrier company itself**: Commission is tied to the load's origin (embarcador), not the carrier.

