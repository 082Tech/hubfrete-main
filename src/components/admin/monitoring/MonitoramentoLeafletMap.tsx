import { useMemo, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTruckIconHtml } from '@/components/maps/TruckIcon';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DriverWithLocation, TrackingPoint } from './index';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const statusColors: Record<string, string> = {
    aguardando: '#f59e0b',
    saiu_para_coleta: '#06b6d4',
    saiu_para_entrega: '#a855f7',
    entregue: '#22c55e',
    cancelada: '#ef4444',
};

const statusLabels: Record<string, string> = {
    aguardando: 'Aguardando',
    saiu_para_coleta: 'Saiu p/ Coleta',
    saiu_para_entrega: 'Saiu p/ Entrega',
    entregue: 'Entregue',
    cancelada: 'Cancelada',
};

// Create TruckIcon using the same function from other maps
const createTruckIcon = (heading: number = 0, isOnline: boolean = false, isSelected: boolean = false) => {
    const size = isSelected ? 56 : 48;
    return new L.DivIcon({
        className: 'truck-marker',
        html: getTruckIconHtml(heading, isOnline, isSelected, size),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
};

// Fit bounds on initial mount only
function FitBoundsOnce({ points }: { points: [number, number][] }) {
    const map = useMap();
    const fitted = useRef(false);

    useEffect(() => {
        if (fitted.current || points.length === 0) return;
        if (points.length === 1) {
            map.setView(points[0], 12);
        } else {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
        }
        fitted.current = true;
    }, [map, points]);

    return null;
}

// Pan to selected driver
function PanToSelected({
    selectedId,
    drivers,
}: {
    selectedId: string | null;
    drivers: DriverWithLocation[];
}) {
    const map = useMap();
    const prevId = useRef<string | null>(null);

    useEffect(() => {
        if (!selectedId || selectedId === prevId.current) return;
        const driver = drivers.find(d => d.motorista_id === selectedId);
        if (driver?.latitude && driver?.longitude) {
            map.setView([driver.latitude, driver.longitude], 14);
        }
        prevId.current = selectedId;
    }, [selectedId, drivers, map]);

    return null;
}

interface MonitoramentoLeafletMapProps {
    drivers: DriverWithLocation[];
    selectedDriverId: string | null;
    onSelectDriver: (id: string | null) => void;
    trackingHistory: TrackingPoint[];
}

export function MonitoramentoLeafletMap({
    drivers,
    selectedDriverId,
    onSelectDriver,
    trackingHistory,
}: MonitoramentoLeafletMapProps) {
    const validDrivers = useMemo(
        () => drivers.filter(d => d.latitude && d.longitude),
        [drivers]
    );

    const allPoints = useMemo(
        () => validDrivers.map(d => [d.latitude!, d.longitude!] as [number, number]),
        [validDrivers]
    );

    const mapCenter: [number, number] = useMemo(() => {
        if (allPoints.length === 0) return [-14.24, -51.93];
        const lat = allPoints.reduce((a, p) => a + p[0], 0) / allPoints.length;
        const lng = allPoints.reduce((a, p) => a + p[1], 0) / allPoints.length;
        return [lat, lng];
    }, [allPoints]);

    const trackingPolyline = useMemo(
        () => trackingHistory
            .filter(p => p.latitude && p.longitude)
            .map(p => [p.latitude, p.longitude] as [number, number]),
        [trackingHistory]
    );

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={mapCenter}
                zoom={4}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBoundsOnce points={allPoints} />
                <PanToSelected selectedId={selectedDriverId} drivers={validDrivers} />

                {/* Tracking history polyline */}
                {trackingPolyline.length > 1 && (
                    <Polyline
                        positions={trackingPolyline}
                        pathOptions={{ color: '#a855f7', weight: 3, opacity: 0.7 }}
                    />
                )}

                {/* Tracking history dots */}
                {trackingHistory.map((point, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === trackingHistory.length - 1;
                    return (
                        <CircleMarker
                            key={`th-${idx}`}
                            center={[point.latitude, point.longitude]}
                            radius={isFirst || isLast ? 8 : 4}
                            pathOptions={{ color: 'white', weight: 2, fillColor: '#05924d', fillOpacity: 1 }}
                        >
                            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                                <div className="text-xs min-w-[120px]">
                                    <p className="text-gray-500">
                                        {new Date(point.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {point.velocidade && <p className="text-gray-500">{Math.round(point.velocidade)} km/h</p>}
                                    {isFirst && <p className="text-green-600 font-medium mt-1">📍 Início</p>}
                                    {isLast && trackingHistory.length > 1 && <p className="text-blue-600 font-medium mt-1">📍 Atual</p>}
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}

                {/* Driver markers */}
                {validDrivers.map(driver => {
                    const isOnline = driver.timestamp ? Date.now() - driver.timestamp < 5 * 60 * 1000 : false;
                    const isSelected = driver.motorista_id === selectedDriverId;
                    const lastSeenText = driver.timestamp
                        ? formatDistanceToNow(new Date(driver.timestamp), { locale: ptBR, addSuffix: false })
                        : null;

                    return (
                        <Marker
                            key={driver.motorista_id}
                            position={[driver.latitude!, driver.longitude!]}
                            icon={createTruckIcon(driver.heading ?? 0, isOnline, isSelected)}
                            eventHandlers={{
                                click: () => onSelectDriver(isSelected ? null : driver.motorista_id),
                            }}
                        >
                            <Tooltip
                                direction="top"
                                offset={[0, -30]}
                                opacity={1}
                                className="driver-tooltip"
                            >
                                <div className="px-3 py-2.5 min-w-[220px] max-w-[280px]">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <p className="font-semibold text-sm truncate">{driver.nome}</p>
                                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isOnline
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            {isOnline ? 'Online' : `Offline há ${lastSeenText || '?'}`}
                                        </span>
                                    </div>

                                    {/* Empresa */}
                                    {driver.empresa_nome && (
                                        <p className="text-xs text-gray-500 mb-1.5">{driver.empresa_nome}</p>
                                    )}

                                    {/* Entrega ativa */}
                                    {driver.entrega_ativa && driver.entrega_codigo && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                                style={{ backgroundColor: statusColors[driver.entrega_status || ''] || '#6b7280' }}
                                            >
                                                {statusLabels[driver.entrega_status || ''] || driver.entrega_status}
                                            </span>
                                            <span className="text-xs font-mono text-gray-600">{driver.entrega_codigo}</span>
                                        </div>
                                    )}

                                    {!driver.entrega_ativa && (
                                        <p className="text-xs text-gray-400 italic">Sem entrega ativa</p>
                                    )}

                                    {driver.velocidade != null && driver.velocidade > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">🚗 {Math.round(driver.velocidade)} km/h</p>
                                    )}

                                    <p className="text-[10px] text-primary mt-2 text-center">Clique para ver detalhes</p>
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Custom tooltip styles */}
            <style>{`
        .driver-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
        }
        .driver-tooltip::before {
          border-top-color: #e2e8f0 !important;
        }
      `}</style>
        </div>
    );
}
