import { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { Globe as GlobeIcon, Truck, MapPin } from 'lucide-react';

interface GlobeInstance {
  controls: () => {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
  };
}

interface GeoJSONData {
  features: object[];
}

// Check if WebGL is available
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl !== null && gl !== undefined;
  } catch {
    return false;
  }
}

// Fallback component when WebGL is not available
function GlobeFallback() {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center">
      {/* Animated background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
          
          {/* Middle ring with rotation */}
          <div 
            className="absolute inset-4 rounded-full border border-primary/30"
            style={{ animation: 'spin 20s linear infinite' }}
          />
          
          {/* Inner glow */}
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5" />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <GlobeIcon className="w-24 h-24 md:w-32 md:h-32 text-primary/40" />
              
              {/* Animated dots representing routes */}
              <div className="absolute -top-4 -right-4 w-3 h-3 rounded-full bg-primary animate-ping" />
              <div className="absolute -bottom-2 -left-6 w-2 h-2 rounded-full bg-primary/60 animate-ping" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-1/2 -right-8 w-2 h-2 rounded-full bg-primary/40 animate-ping" style={{ animationDelay: '1s' }} />
            </div>
          </div>
          
          {/* Route indicators */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-primary/60">
            <MapPin className="w-3 h-3" />
            <span>São Paulo</span>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-primary/60">
            <Truck className="w-3 h-3" />
            <span>Brasil</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogisticsGlobe() {
  const globeEl = useRef<GlobeInstance | null>(null);
  const [countries, setCountries] = useState<GeoJSONData>({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);
  const [hasError, setHasError] = useState(false);

  // Primary green from design system (HSL 161 93% 30% converted to hex)
  const PRIMARY_GREEN = '#059669';
  const GLOW_GREEN = '#10b981';

  // Check WebGL support on mount
  useEffect(() => {
    setWebGLSupported(isWebGLAvailable());
  }, []);

  useEffect(() => {
    if (!webGLSupported) return;
    
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(setCountries)
      .catch(() => setHasError(true));

    if (globeEl.current) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false;
    }
  }, [webGLSupported]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, 600);
        setDimensions({ width: size, height: size });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Brazilian logistics routes data
  const arcsData = [
    // Major Brazilian routes
    { startLat: -23.55, startLng: -46.63, endLat: -22.91, endLng: -43.17 }, // São Paulo -> Rio
    { startLat: -23.55, startLng: -46.63, endLat: -19.92, endLng: -43.94 }, // São Paulo -> BH
    { startLat: -23.55, startLng: -46.63, endLat: -25.43, endLng: -49.27 }, // São Paulo -> Curitiba
    { startLat: -23.55, startLng: -46.63, endLat: -30.03, endLng: -51.23 }, // São Paulo -> Porto Alegre
    { startLat: -23.55, startLng: -46.63, endLat: -12.97, endLng: -38.50 }, // São Paulo -> Salvador
    { startLat: -23.55, startLng: -46.63, endLat: -3.72, endLng: -38.54 },  // São Paulo -> Fortaleza
    { startLat: -23.55, startLng: -46.63, endLat: -15.79, endLng: -47.88 }, // São Paulo -> Brasília
    // International connections
    { startLat: -23.55, startLng: -46.63, endLat: -34.60, endLng: -58.38 }, // São Paulo -> Buenos Aires
    { startLat: -23.55, startLng: -46.63, endLat: 40.71, endLng: -74.01 },  // São Paulo -> NYC
    { startLat: -23.55, startLng: -46.63, endLat: 31.23, endLng: 121.47 },  // São Paulo -> Shanghai
  ];

  const handleGlobeReady = useCallback(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false;
    }
  }, []);

  // Show loading state while checking WebGL
  if (webGLSupported === null) {
    return (
      <div className="w-full h-[400px] md:h-[500px] flex items-center justify-center">
        <div className="w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full bg-primary/5 animate-pulse" />
      </div>
    );
  }

  // Show fallback if WebGL is not supported or there was an error
  if (!webGLSupported || hasError) {
    return <GlobeFallback />;
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full flex items-center justify-center"
      style={{ height: dimensions.height }}
    >
      {/* Glow effect behind globe */}
      <div 
        className="absolute rounded-full blur-3xl opacity-20"
        style={{
          width: dimensions.width * 0.8,
          height: dimensions.height * 0.8,
          background: `radial-gradient(circle, ${GLOW_GREEN} 0%, transparent 70%)`,
        }}
      />
      
      <Globe
        ref={globeEl as any}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe={false}
        showAtmosphere={true}
        atmosphereColor={GLOW_GREEN}
        atmosphereAltitude={0.15}
        
        // Continents as hex polygons (dot matrix effect)
        hexPolygonsData={countries.features}
        hexPolygonResolution={3}
        hexPolygonMargin={0.4}
        hexPolygonColor={() => PRIMARY_GREEN}
        hexPolygonAltitude={0.01}
        
        // Logistics arcs
        arcsData={arcsData}
        arcColor={() => GLOW_GREEN}
        arcDashLength={0.5}
        arcDashGap={0.5}
        arcDashAnimateTime={2000}
        arcStroke={0.5}
        arcCurveResolution={64}
        arcAltitudeAutoScale={0.3}
        
        onGlobeReady={handleGlobeReady}
      />
    </div>
  );
}
