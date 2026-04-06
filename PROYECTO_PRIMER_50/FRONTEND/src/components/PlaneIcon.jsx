/**
 * PlaneIcon - Reusable SVG airplane icon
 * The SVG path points UPWARD by default, so rotations are:
 *   up = 0°, right = 90°, down = 180°, left = -90°
 */
export default function PlaneIcon({ size = 24, color = 'currentColor', stroke = 'none', strokeWidth = 0, className = '', style = {}, direction = 'right' }) {
  const rotation = direction === 'right' ? 90 : direction === 'left' ? -90 : direction === 'down' ? 180 : 0;

  return (
    <svg
      className={className}
      style={{ transform: `rotate(${rotation}deg)`, ...style }}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

/**
 * Status icons as SVG to avoid emoji DOM issues
 */
export function RunwayIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M2 20h20" />
      <path d="M4 20V10l8-6 8 6v10" />
      <path d="M12 4v16" />
      <path d="M4 14h16" />
    </svg>
  );
}

export function GateIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <path d="M2 20h20" />
      <path d="M14 12v.01" />
    </svg>
  );
}

export function QueueIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
      <circle cx="19" cy="6" r="1.5" fill={color} />
      <circle cx="19" cy="12" r="1.5" fill={color} />
      <circle cx="19" cy="18" r="1.5" fill={color} />
    </svg>
  );
}

export function LogIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
