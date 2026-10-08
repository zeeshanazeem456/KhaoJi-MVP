import { useId } from "react";

/**
 * The KhaoJi signature: a strip of Pakistani truck-art border pattern.
 * Pure SVG, repeats horizontally, scales crisply.
 */
export function TruckBand({ className = "", height = 14 }: { className?: string; height?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden className={`block w-full ${className}`} height={height} preserveAspectRatio="none">
      <defs>
        <pattern id={`tb-${id}`} width={height * 2} height={height} patternUnits="userSpaceOnUse">
          <svg viewBox="0 0 28 14" width={height * 2} height={height}>
            <rect width="28" height="14" fill="#0E4D64" />
            <polygon points="0,0 7,6 14,0" fill="#FFC72C" />
            <polygon points="14,14 21,8 28,14" fill="#13804A" />
            <polygon points="0,14 3.5,11 7,14" fill="#C2185B" />
            <circle cx="21" cy="4" r="2.6" fill="#D9301F" />
            <circle cx="21" cy="4" r="1" fill="#FFF4D6" />
            <circle cx="7" cy="10.5" r="1.6" fill="#FFF4D6" />
          </svg>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#tb-${id})`} />
    </svg>
  );
}
