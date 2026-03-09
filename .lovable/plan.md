

## Plan: Fix Map Behavior on Both Portals

### Problems
1. **Embarcador**: When switching cargo, the map stays at the old location instead of re-fitting to the new cargo's markers
2. **Transportador**: When the user zooms in to inspect, the map keeps resetting the zoom (likely from realtime data updates causing re-renders/remounts)

### Root Cause
The `DetailPanelLeafletMap` uses `FitBoundsOnce` with a `hasFitted` ref — it only fits bounds once per mount. The issue is that when the selected cargo changes, the Leaflet `MapContainer` doesn't update its center/zoom (known Leaflet-React limitation). Both portals need the map to **remount** when the cargo changes, but **not** when realtime location data updates.

### Solution

**File: `src/pages/portals/embarcador/GestaoCargas.tsx`**
- Add `key={entrega.id}` to the `<DetailPanelLeafletMap>` usage inside `DetailPanel`, so the map fully remounts when a different cargo is selected

**File: `src/pages/portals/transportadora/OperacaoDiaria.tsx`**
- Same fix: add `key={entrega.id}` to the `<DetailPanelLeafletMap>` usage inside the transportador's `DetailPanel`
- Since `selectedEntregaLive` updates the entrega object reference on realtime refreshes but keeps the same `id`, the key won't change and the map won't remount — preserving the user's zoom level

This is the simplest and most reliable fix: the `key` prop forces React to destroy and recreate the component only when the cargo ID changes, which is exactly the desired behavior for both issues.

### Technical Details
- `key={entrega.id}` on `DetailPanelLeafletMap` in both `GestaoCargas.tsx` (~line 454) and `OperacaoDiaria.tsx` (~line 498)
- No changes needed to `DetailPanelLeafletMap.tsx` itself
- The `FitBoundsOnce` pattern continues to work correctly — it fires once per mount, and the mount only happens when the entrega ID changes

