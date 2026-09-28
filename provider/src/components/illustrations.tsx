/* The illustration beside the sign-in forms. Flat, two-tone, drawn on the brand palette. */

const P = "oklch(0.53 0.2 266)";
const P_SOFT = "oklch(0.94 0.04 266)";
const TEAL_SOFT = "oklch(0.95 0.035 190)";
const GREEN = "oklch(0.6 0.13 165)";
const AMBER = "oklch(0.76 0.15 72)";
const INK = "oklch(0.27 0.09 268)";
const LINE = "oklch(0.9 0.012 258)";

type Props = { className?: string };

export function BusinessIllustration({ className }: Props) {
  return (
    <svg viewBox="0 0 320 260" className={className} aria-hidden>
      <circle cx="160" cy="134" r="118" fill={TEAL_SOFT} />
      <rect x="70" y="92" width="180" height="128" rx="10" fill="white" stroke={LINE} />
      <path d="M60 92 l20 -44 h160 l20 44Z" fill={P} />
      <path d="M60 92 h40 v10 a20 20 0 0 1 -40 0Z M100 92 h40 v10 a20 20 0 0 1 -40 0Z M140 92 h40 v10 a20 20 0 0 1 -40 0Z M180 92 h40 v10 a20 20 0 0 1 -40 0Z M220 92 h40 v10 a20 20 0 0 1 -40 0Z" fill="white" />
      <path d="M100 92 h40 v10 a20 20 0 0 1 -40 0Z M180 92 h40 v10 a20 20 0 0 1 -40 0Z" fill="oklch(0.94 0.04 266)" />
      <rect x="92" y="136" width="62" height="84" rx="6" fill={P_SOFT} />
      <circle cx="142" cy="180" r="3.5" fill={P} />
      <rect x="170" y="136" width="62" height="46" rx="6" fill="oklch(0.95 0.035 190)" stroke={LINE} />
      <rect x="176" y="194" width="50" height="10" rx="5" fill={GREEN} />
      <g transform="translate(236 70)">
        <circle r="30" fill="white" stroke={LINE} />
        <path d="M-12 0 l8 8 16 -18" stroke={GREEN} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(64 176)">
        <rect x="-26" y="-18" width="52" height="36" rx="10" fill="white" stroke={LINE} />
        <path d="M-10-5l2.3 4.7 5.2.8-3.8 3.6.9 5.2L-10 6-14.6 8.3l.9-5.2-3.8-3.6 5.2-.8Z" fill={AMBER} />
        <rect x="0" y="-4" width="16" height="8" rx="4" fill={INK} opacity="0.7" />
      </g>
    </svg>
  );
}
