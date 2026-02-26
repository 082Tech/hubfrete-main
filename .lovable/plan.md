

## Plan: Show Truck + Tracking History on Both Maps & Per-Delivery Dot Filtering

### Problem Summary
1. **Trip detail map (ViagemMultiPointMap)**: Shows truck icon + tracking dots, but the truck icon is already there. Need to confirm both work.
2. **Delivery detail map (DetailPanelLeafletMap)**: Shows tracking history dots (via `TrackingHistoryMarkers`) but does NOT show the truck icon -- the `driverLocation` is passed but let me verify. Actually it does show the truck. The issue may be that `TrackingHistoryMarkers` fetches the full trip's history without filtering to the delivery's time window.
3. **Per-delivery tracking dots**: The user wants that when viewing a specific delivery's map, the tracking history dots should only show points that fall within that delivery's active time window (from first status change to final status), colored by the delivery's status at each point.

### Approach

#### 1. Ensure Both Maps Show Truck + Tracking History
- **ViagemMultiPointMap**: Already shows both truck (`driverLocation`) and tracking dots (`trackingPoints`). Confirmed working.
- **DetailPanelLeafletMap**: Already shows truck and uses `TrackingHistoryMarkers` with `entregaId`. The component fetches the full trip's tracking history. The fix needed is to **filter the tracking points to only the delivery's time window**.

#### 2. Per-Delivery Tracking History Filtering (Core Change)

The `TrackingHistoryMarkers` component currently fetches ALL tracking history for the entire trip (via `viagem_id` lookup from `entrega_id`). Instead, it should:

1. **Fetch the delivery's event timeline** from `entrega_eventos` to determine the time boundaries:
   - **Start time**: The first event for this delivery (e.g., `criado` or `aceite`)
   - **End time**: The final terminal event (`entregue` or `cancelada`), or current time if still active

2. **Filter tracking points** to only include those where `tracked_at` falls within `[start_time, end_time]`

3. **Color the dots** based on what status the delivery was in at each tracking point's timestamp. This is done by cross-referencing each `tracked_at` against the delivery's status change events:
   - For each tracking point, find the most recent `entrega_evento` with `timestamp <= tracked_at`
   - Map the evento `tipo` to the corresponding delivery status
   - Use that status for the dot color

### Technical Changes

#### File: `src/components/maps/TrackingHistoryMarkers.tsx`
- Add a new fetch step: when `entregaId` is provided, also fetch `entrega_eventos` for that delivery
- Build a sorted list of status change timestamps from events
- Filter `tracking_historico` points to only those within the delivery's active time window
- Override each point's `status` color based on the delivery's status at that timestamp (using binary search through events)

#### File: `src/components/maps/ViagemMultiPointMap.tsx`
- No changes needed -- already shows both truck and tracking dots

#### File: `src/components/maps/DetailPanelLeafletMap.tsx`
- No changes needed -- already renders truck icon and `TrackingHistoryMarkers`

### Implementation Details

**Event-to-Status Mapping** (in TrackingHistoryMarkers):
```text
evento.tipo -> delivery status:
  'criado'/'aceite'     -> 'aguardando'
  'saiu_para_coleta'    -> 'saiu_para_coleta'
  'saiu_para_entrega'   -> 'saiu_para_entrega'
  'entregue'            -> 'entregue'
  'cancelada'           -> 'cancelada'
  'problema'            -> 'problema'
```

**Filtering Logic**:
- Fetch `entrega_eventos` sorted by `timestamp ASC`
- `windowStart` = first event's timestamp
- `windowEnd` = last terminal event's timestamp (or `now()` if still active)
- Filter tracking points: `windowStart <= tracked_at <= windowEnd`
- For each remaining point, binary-search the events list to find the active status at `tracked_at`

**No DB Changes Required**: All data already exists in `entrega_eventos` and `tracking_historico`. This is purely a frontend filtering/coloring change.

