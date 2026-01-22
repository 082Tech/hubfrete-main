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
  size = 40,
  className = ''
}: TruckIconProps) {
  const rotation = heading ?? 0;
  const primaryColor = isSelected ? '#3b82f6' : isOnline ? '#22c55e' : '#6b7280';
  const shadowColor = isSelected ? 'rgba(59, 130, 246, 0.4)' : isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(0, 0, 0, 0.2)';
  
  return (
    <div 
      className={`relative ${className}`}
      style={{ 
        width: size, 
        height: size,
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.5s ease-out',
        willChange: 'transform'
      }}
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow for 3D effect */}
        <ellipse
          cx="20"
          cy="32"
          rx="10"
          ry="4"
          fill={shadowColor}
        />
        
        {/* Truck body - trailer/cargo area */}
        <rect
          x="12"
          y="14"
          width="16"
          height="18"
          rx="2"
          fill={primaryColor}
          stroke={isSelected ? '#1d4ed8' : isOnline ? '#16a34a' : '#4b5563'}
          strokeWidth="1.5"
        />
        
        {/* Cargo lines for detail */}
        <line x1="15" y1="18" x2="25" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <line x1="15" y1="22" x2="25" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <line x1="15" y1="26" x2="25" y2="26" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        
        {/* Cab (front of truck - pointing up/north) */}
        <rect
          x="14"
          y="6"
          width="12"
          height="10"
          rx="2"
          fill={isSelected ? '#60a5fa' : isOnline ? '#4ade80' : '#9ca3af'}
          stroke={isSelected ? '#1d4ed8' : isOnline ? '#16a34a' : '#4b5563'}
          strokeWidth="1.5"
        />
        
        {/* Windshield */}
        <rect
          x="16"
          y="7"
          width="8"
          height="4"
          rx="1"
          fill="rgba(255,255,255,0.6)"
        />
        
        {/* Side mirrors */}
        <rect x="10" y="10" width="3" height="2" rx="0.5" fill={primaryColor} />
        <rect x="27" y="10" width="3" height="2" rx="0.5" fill={primaryColor} />
        
        {/* Wheels */}
        <circle cx="15" cy="30" r="2.5" fill="#1f2937" stroke="#374151" strokeWidth="1" />
        <circle cx="25" cy="30" r="2.5" fill="#1f2937" stroke="#374151" strokeWidth="1" />
        <circle cx="15" cy="14" r="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />
        <circle cx="25" cy="14" r="2" fill="#1f2937" stroke="#374151" strokeWidth="1" />
        
        {/* Direction indicator arrow at top */}
        <polygon
          points="20,2 17,6 23,6"
          fill="white"
          stroke={primaryColor}
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}

/**
 * Generate SVG HTML string for use with Leaflet DivIcon
 */
export function getTruckIconSvg(
  heading: number = 0,
  isOnline: boolean = false,
  isSelected: boolean = false,
  size: number = 40
): string {
  const primaryColor = isSelected ? '#3b82f6' : isOnline ? '#22c55e' : '#6b7280';
  const shadowColor = isSelected ? 'rgba(59, 130, 246, 0.4)' : isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(0, 0, 0, 0.2)';
  const cabColor = isSelected ? '#60a5fa' : isOnline ? '#4ade80' : '#9ca3af';
  const strokeColor = isSelected ? '#1d4ed8' : isOnline ? '#16a34a' : '#4b5563';

  return `
    <svg
      viewBox="0 0 40 40"
      width="${size}"
      height="${size}"
      xmlns="http://www.w3.org/2000/svg"
      style="transform: rotate(${heading}deg); transition: transform 0.5s ease-out;"
    >
      <!-- Shadow for 3D effect -->
      <ellipse cx="20" cy="32" rx="10" ry="4" fill="${shadowColor}" />
      
      <!-- Truck body - trailer/cargo area -->
      <rect x="12" y="14" width="16" height="18" rx="2" fill="${primaryColor}" stroke="${strokeColor}" stroke-width="1.5" />
      
      <!-- Cargo lines for detail -->
      <line x1="15" y1="18" x2="25" y2="18" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
      <line x1="15" y1="22" x2="25" y2="22" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
      <line x1="15" y1="26" x2="25" y2="26" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
      
      <!-- Cab (front of truck - pointing up/north) -->
      <rect x="14" y="6" width="12" height="10" rx="2" fill="${cabColor}" stroke="${strokeColor}" stroke-width="1.5" />
      
      <!-- Windshield -->
      <rect x="16" y="7" width="8" height="4" rx="1" fill="rgba(255,255,255,0.6)" />
      
      <!-- Side mirrors -->
      <rect x="10" y="10" width="3" height="2" rx="0.5" fill="${primaryColor}" />
      <rect x="27" y="10" width="3" height="2" rx="0.5" fill="${primaryColor}" />
      
      <!-- Wheels -->
      <circle cx="15" cy="30" r="2.5" fill="#1f2937" stroke="#374151" stroke-width="1" />
      <circle cx="25" cy="30" r="2.5" fill="#1f2937" stroke="#374151" stroke-width="1" />
      <circle cx="15" cy="14" r="2" fill="#1f2937" stroke="#374151" stroke-width="1" />
      <circle cx="25" cy="14" r="2" fill="#1f2937" stroke="#374151" stroke-width="1" />
      
      <!-- Direction indicator arrow at top -->
      <polygon points="20,2 17,6 23,6" fill="white" stroke="${primaryColor}" stroke-width="0.5" />
    </svg>
  `;
}
