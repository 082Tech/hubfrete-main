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
 * Includes a Wi-Fi indicator in the top-right corner (green=online, red=offline).
 * All trucks are fully visible (no transparency for offline).
 */
export function TruckIcon({ 
  heading = 0, 
  isOnline = false, 
  isSelected = false,
  size = 48,
  className = ''
}: TruckIconProps) {
  const rotation = heading ?? 0;
  const uniqueId = React.useId();
  
  // Wi-Fi indicator colors
  const wifiColor = isOnline ? '#22c55e' : '#ef4444';
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      
      {/* Wi-Fi indicator badge in top-right corner (non-rotating) */}
      <div
        style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: size * 0.35,
          height: size * 0.35,
          backgroundColor: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          width={size * 0.22}
          height={size * 0.22}
          fill={wifiColor}
        >
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
        </svg>
      </div>
      
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
          style={{ shapeRendering: 'geometricPrecision' }}
        >
          <defs>
            <radialGradient id={`shadowGrad-${uniqueId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="black" stopOpacity="0.3" />
              <stop offset="100%" stopColor="black" stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Shadow */}
          <ellipse cx="40" cy="42" rx="22" ry="32" fill={`url(#shadowGrad-${uniqueId})`} />
          
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
 * Includes Wi-Fi indicator badge (green=online, red=offline)
 * All trucks are fully visible (no transparency/grayscale for offline)
 */
export function getTruckIconHtml(
  heading: number = 0,
  isOnline: boolean = false,
  _isSelected: boolean = false,
  size: number = 48
): string {
  const wifiColor = isOnline ? '#22c55e' : '#ef4444';
  // Generate unique ID for gradient to avoid SVG ID collisions in Leaflet
  const uniqueId = `shadow-${Math.random().toString(36).substring(2, 9)}`;

  // Wi-Fi icon badge (positioned in top-right, non-rotating)
  const wifiBadgeHtml = `
    <div style="
      position: absolute;
      top: -2px;
      right: -2px;
      width: ${size * 0.35}px;
      height: ${size * 0.35}px;
      background-color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      z-index: 10;
    ">
      <svg viewBox="0 0 24 24" width="${size * 0.22}" height="${size * 0.22}" fill="${wifiColor}">
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
      </svg>
    </div>
  `;

  return `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      ${wifiBadgeHtml}
      <div style="
        width: ${size}px;
        height: ${size}px;
        transform: rotate(${heading}deg);
        transition: transform 0.5s ease-out;
        will-change: transform;
      ">
        <svg viewBox="0 0 80 80" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="${uniqueId}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="black" stop-opacity="0.3" />
              <stop offset="100%" stop-color="black" stop-opacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="40" cy="42" rx="22" ry="32" fill="url(#${uniqueId})" />
          <rect x="22" y="15" width="4" height="8" rx="2" fill="#222" />
          <rect x="54" y="15" width="4" height="8" rx="2" fill="#222" />
          <rect x="22" y="45" width="4" height="8" rx="2" fill="#222" />
          <rect x="54" y="45" width="4" height="8" rx="2" fill="#222" />
          <rect x="25" y="10" width="30" height="40" rx="2" fill="#FFFFFF" stroke="#D1D1D1" stroke-width="0.5" />
          <rect x="28" y="13" width="24" height="34" rx="1" fill="#F9F9F9" />
          <rect x="27" y="51" width="26" height="15" rx="3" fill="#FFFFFF" stroke="#D1D1D1" stroke-width="0.5" />
          <path d="M29 54 Q40 51 51 54 L50 59 Q40 57 30 59 Z" fill="#333" />
        </svg>
      </div>
    </div>
  `;
}