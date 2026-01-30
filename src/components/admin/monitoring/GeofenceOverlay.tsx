import { Circle, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';
import { MapPin, Home, Building } from 'lucide-react';

export interface Geofence {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  raio_metros: number;
  tipo: 'coleta' | 'entrega' | 'deposito' | 'custom';
  ativo: boolean;
  entrega_id: string | null;
}

interface GeofenceOverlayProps {
  geofences: Geofence[];
  showLabels?: boolean;
}

const GEOFENCE_COLORS = {
  coleta: { fill: '#f97316', stroke: '#ea580c' }, // Orange
  entrega: { fill: '#22c55e', stroke: '#16a34a' }, // Green
  deposito: { fill: '#3b82f6', stroke: '#2563eb' }, // Blue
  custom: { fill: '#8b5cf6', stroke: '#7c3aed' }, // Purple
};

const GEOFENCE_ICONS = {
  coleta: MapPin,
  entrega: Home,
  deposito: Building,
  custom: MapPin,
};

export function GeofenceOverlay({ geofences, showLabels = true }: GeofenceOverlayProps) {
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);

  return (
    <>
      {geofences.map((geofence) => {
        const colors = GEOFENCE_COLORS[geofence.tipo] || GEOFENCE_COLORS.custom;
        const Icon = GEOFENCE_ICONS[geofence.tipo] || MapPin;

        return (
          <Circle
            key={geofence.id}
            center={{ lat: geofence.latitude, lng: geofence.longitude }}
            radius={geofence.raio_metros}
            options={{
              fillColor: colors.fill,
              fillOpacity: 0.15,
              strokeColor: colors.stroke,
              strokeOpacity: 0.6,
              strokeWeight: 2,
              clickable: true,
              zIndex: 1,
            }}
            onClick={() => setSelectedGeofence(geofence)}
          />
        );
      })}

      {/* Info Window for selected geofence */}
      {selectedGeofence && (
        <InfoWindow
          position={{
            lat: selectedGeofence.latitude,
            lng: selectedGeofence.longitude,
          }}
          onCloseClick={() => setSelectedGeofence(null)}
        >
          <div className="p-2 min-w-[150px]">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    GEOFENCE_COLORS[selectedGeofence.tipo]?.fill || GEOFENCE_COLORS.custom.fill,
                }}
              />
              <span className="font-medium text-sm capitalize">{selectedGeofence.tipo}</span>
            </div>
            <p className="text-sm font-semibold">{selectedGeofence.nome}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Raio: {selectedGeofence.raio_metros}m
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
