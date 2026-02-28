

# Correção no Banco de Produção: Mover Entrega para Nova Viagem

## Problema
A entrega **CRG-2026-0303-E01** (status "aguardando") foi vinculada à viagem **VGM-2026-0083** que já está **finalizada**. Isso não deveria ter acontecido.

## Solução (3 operações SQL diretas no banco)

1. **Remover** o vínculo da entrega com a viagem finalizada (tabela `viagem_entregas`)
2. **Criar** uma nova viagem com status "aguardando" para o mesmo motorista, veículo e carroceria (o código VGM será gerado automaticamente pelo trigger `generate_viagem_codigo`)
3. **Vincular** a entrega à nova viagem (tabela `viagem_entregas`, ordem = 1)

### Dados confirmados
- Entrega ID: `04a2ecef-92a3-4476-b995-c788f8e41b57`
- Motorista: `6f49498a-3b61-473a-a91e-45e608df6335`
- Veículo: `3d2203e9-5554-49cb-b837-097809593725`
- Carroceria: `ac01cb38-bde9-430f-a28b-5a11e1748d62`
- Viagem antiga: `787aa089-0d47-4dd6-a1ba-2334ca7ee2f7` (VGM-2026-0083, finalizada)

### Detalhes Tecnicos

Sera executada uma migration SQL que faz:

```text
-- 1. Remove vinculo antigo
DELETE FROM viagem_entregas WHERE entrega_id = '04a2ecef-...' AND viagem_id = '787aa089-...';

-- 2. Cria nova viagem (codigo gerado por trigger)
INSERT INTO viagens (motorista_id, veiculo_id, carroceria_id, status, codigo)
VALUES (..., 'aguardando', '');

-- 3. Vincula entrega a nova viagem
INSERT INTO viagem_entregas (viagem_id, entrega_id, ordem) VALUES (nova_viagem, entrega, 1);
```

Nenhum arquivo de codigo sera alterado -- apenas operacoes no banco de dados.
