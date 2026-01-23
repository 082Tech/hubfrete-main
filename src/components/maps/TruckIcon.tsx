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
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      {/* Subtle pulse animation when online */}
      {isOnline && (
        <div
          className="absolute rounded-full"
          style={{
            width: size * 0.55,
            height: size * 0.55,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(34, 197, 94, 0.35)',
            animation: 'subtlePulse 2s ease-out infinite',
          }}
        />
      )}
      
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
          viewBox="0 0 80 80"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="black" stopOpacity="0.3" />
              <stop offset="100%" stopColor="black" stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Shadow */}
          <ellipse cx="40" cy="42" rx="22" ry="32" fill="url(#shadowGrad)" />
          
          {/* Wheels - front */}
          <rect x="22" y="15" width="4" height="8" rx="2" fill="#222" />
          <rect x="54" y="15" width="4" height="8" rx="2" fill="#222" />
          
          {/* Wheels - rear */}
          <rect x="22" y="45" width="4" height="8" rx="2" fill="#222" />
          <rect x="54" y="45" width="4" height="8" rx="2" fill="#222" />
          
          {/* Truck body - cargo/cab */}
          <rect x="25" y="10" width="30" height="40" rx="2" fill="#FFFFFF" stroke="#D1D1D1" strokeWidth="0.5" />
          
          {/* Cargo area detail */}
          <rect x="28" y="13" width="24" height="34" rx="1" fill="#F9F9F9" />
          
          {/* Front bumper/cab */}
          <rect x="27" y="51" width="26" height="15" rx="3" fill="#FFFFFF" stroke="#D1D1D1" strokeWidth="0.5" />
          
          {/* Windshield */}
          <path d="M29 54 Q40 51 51 54 L50 59 Q40 57 30 59 Z" fill="#333" />
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
  _isSelected: boolean = false,
  size: number = 56,
  uniqueId?: string
): string {
  const uid = uniqueId || Math.random().toString(36).substr(2, 9);
  
  // Green pulse ring when online
  const pulseStyle = isOnline ? `
    <style>
      @keyframes pulse-${uid} {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
        50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.3; }
      }
    </style>
    <div style="
      position: absolute;
      width: ${size * 0.7}px;
      height: ${size * 0.7}px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(34, 197, 94, 0.4);
      border-radius: 50%;
      animation: pulse-${uid} 2s ease-in-out infinite;
      pointer-events: none;
    "></div>
  ` : '';

  return `
    ${pulseStyle}
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      <div style="
        width: ${size}px;
        height: ${size}px;
        transform: rotate(${heading}deg);
        transition: transform 0.5s ease-out;
      ">
        <svg viewBox="0 0 80 80" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <!-- Shadow ellipse -->
          <ellipse cx="40" cy="44" rx="20" ry="28" fill="rgba(0,0,0,0.15)" />
          
          <!-- Wheels -->
          <rect x="23" y="16" width="4" height="8" rx="2" fill="#333" />
          <rect x="53" y="16" width="4" height="8" rx="2" fill="#333" />
          <rect x="23" y="46" width="4" height="8" rx="2" fill="#333" />
          <rect x="53" y="46" width="4" height="8" rx="2" fill="#333" />
          
          <!-- Truck body (cargo area) -->
          <rect x="26" y="12" width="28" height="38" rx="2" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1" />
          <rect x="29" y="15" width="22" height="32" rx="1" fill="#F5F5F5" />
          
          <!-- Truck cab -->
          <rect x="28" y="51" width="24" height="14" rx="3" fill="#FFFFFF" stroke="#CCCCCC" stroke-width="1" />
          
          <!-- Windshield -->
          <path d="M30 54 Q40 51 50 54 L49 58 Q40 56 31 58 Z" fill="#333" />
        </svg>
      </div>
    </div>
  `;
}
