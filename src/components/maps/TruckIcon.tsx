import React from 'react';

interface TruckIconProps {
  heading?: number | null;
  isOnline?: boolean;
  isSelected?: boolean;
  size?: number;
  className?: string;
}

/**
 * Top-down 3D-style truck icon that can rotate based on heading.
 * Similar to Uber's vehicle icons.
 */
export function TruckIcon({ 
  heading = 0, 
  isOnline = false, 
  isSelected = false,
  size = 48,
  className = ''
}: TruckIconProps) {
  const rotation = heading ?? 0;
  const primaryColor = isSelected ? '#3b82f6' : isOnline ? '#22c55e' : '#6b7280';
  const cabColor = isSelected ? '#60a5fa' : isOnline ? '#4ade80' : '#9ca3af';
  const strokeColor = isSelected ? '#1d4ed8' : isOnline ? '#16a34a' : '#4b5563';
  const shadowColor = isSelected ? 'rgba(59, 130, 246, 0.4)' : isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(0, 0, 0, 0.2)';
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      {/* Rotatable truck container */}
      <div
        style={{
          width: size,
          height: size,
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.5s ease-out',
          willChange: 'transform',
        }}
      >
        <svg
          viewBox="0 0 48 48"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shadow for 3D effect */}
          <ellipse
            cx="24"
            cy="40"
            rx="14"
            ry="5"
            fill={shadowColor}
          />
          
          {/* Truck body - trailer/cargo area */}
          <rect
            x="12"
            y="18"
            width="24"
            height="20"
            rx="3"
            fill={primaryColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          
          {/* Cargo horizontal lines for detail */}
          <line x1="16" y1="24" x2="32" y2="24" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          <line x1="16" y1="30" x2="32" y2="30" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          
          {/* Cab (front of truck - pointing up/north) - more rounded */}
          <rect
            x="15"
            y="6"
            width="18"
            height="14"
            rx="4"
            fill={cabColor}
            stroke={strokeColor}
            strokeWidth="2"
          />
          
          {/* Windshield - curved appearance */}
          <rect
            x="18"
            y="8"
            width="12"
            height="6"
            rx="2"
            fill="rgba(255,255,255,0.7)"
          />
          
          {/* Windshield reflection */}
          <rect
            x="19"
            y="9"
            width="4"
            height="4"
            rx="1"
            fill="rgba(255,255,255,0.4)"
          />
          
          {/* Side mirrors */}
          <ellipse cx="10" cy="12" rx="3" ry="2" fill={cabColor} stroke={strokeColor} strokeWidth="1" />
          <ellipse cx="38" cy="12" rx="3" ry="2" fill={cabColor} stroke={strokeColor} strokeWidth="1" />
          
          {/* Front wheels */}
          <ellipse cx="16" cy="18" rx="3" ry="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />
          <ellipse cx="32" cy="18" rx="3" ry="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />
          
          {/* Rear wheels (dual) */}
          <ellipse cx="15" cy="36" rx="3.5" ry="2.5" fill="#1f2937" stroke="#374151" strokeWidth="1" />
          <ellipse cx="33" cy="36" rx="3.5" ry="2.5" fill="#1f2937" stroke="#374151" strokeWidth="1" />
          
          {/* Wheel shine */}
          <ellipse cx="15" cy="35" rx="1" ry="0.5" fill="rgba(255,255,255,0.3)" />
          <ellipse cx="33" cy="35" rx="1" ry="0.5" fill="rgba(255,255,255,0.3)" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Generate SVG HTML string for use with Leaflet DivIcon or Google Maps OverlayView
 * No avatar badge - avatar is shown in tooltip/popup instead
 */
export function getTruckIconHtml(
  heading: number = 0,
  isOnline: boolean = false,
  isSelected: boolean = false,
  size: number = 48
): string {
  const primaryColor = isSelected ? '#3b82f6' : isOnline ? '#22c55e' : '#6b7280';
  const shadowColor = isSelected ? 'rgba(59, 130, 246, 0.4)' : isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(0, 0, 0, 0.2)';
  const cabColor = isSelected ? '#60a5fa' : isOnline ? '#4ade80' : '#9ca3af';
  const strokeColor = isSelected ? '#1d4ed8' : isOnline ? '#16a34a' : '#4b5563';

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      <div style="
        width: ${size}px;
        height: ${size}px;
        transform: rotate(${heading}deg);
        transition: transform 0.5s ease-out;
        will-change: transform;
      ">
        <svg viewBox="0 0 48 48" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="24" cy="40" rx="14" ry="5" fill="${shadowColor}" />
          <rect x="12" y="18" width="24" height="20" rx="3" fill="${primaryColor}" stroke="${strokeColor}" stroke-width="2" />
          <line x1="16" y1="24" x2="32" y2="24" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <line x1="16" y1="30" x2="32" y2="30" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
          <rect x="15" y="6" width="18" height="14" rx="4" fill="${cabColor}" stroke="${strokeColor}" stroke-width="2" />
          <rect x="18" y="8" width="12" height="6" rx="2" fill="rgba(255,255,255,0.7)" />
          <rect x="19" y="9" width="4" height="4" rx="1" fill="rgba(255,255,255,0.4)" />
          <ellipse cx="10" cy="12" rx="3" ry="2" fill="${cabColor}" stroke="${strokeColor}" stroke-width="1" />
          <ellipse cx="38" cy="12" rx="3" ry="2" fill="${cabColor}" stroke="${strokeColor}" stroke-width="1" />
          <ellipse cx="16" cy="18" rx="3" ry="2" fill="#1f2937" stroke="#374151" stroke-width="1" />
          <ellipse cx="32" cy="18" rx="3" ry="2" fill="#1f2937" stroke="#374151" stroke-width="1" />
          <ellipse cx="15" cy="36" rx="3.5" ry="2.5" fill="#1f2937" stroke="#374151" stroke-width="1" />
          <ellipse cx="33" cy="36" rx="3.5" ry="2.5" fill="#1f2937" stroke="#374151" stroke-width="1" />
          <ellipse cx="15" cy="35" rx="1" ry="0.5" fill="rgba(255,255,255,0.3)" />
          <ellipse cx="33" cy="35" rx="1" ry="0.5" fill="rgba(255,255,255,0.3)" />
        </svg>
      </div>
    </div>
  `;
}
