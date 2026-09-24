/* Small spot illustrations used across the site. Flat, two-tone, drawn on the brand palette. */

const P = "oklch(0.53 0.2 266)";
const P_SOFT = "oklch(0.94 0.04 266)";
const TEAL = "oklch(0.7 0.12 190)";
const TEAL_SOFT = "oklch(0.95 0.035 190)";
const GREEN = "oklch(0.6 0.13 165)";
const AMBER = "oklch(0.76 0.15 72)";
const INK = "oklch(0.27 0.09 268)";
const LINE = "oklch(0.9 0.012 258)";

type Props = { className?: string };

export function SearchSpot({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden>
      <circle cx="100" cy="78" r="64" fill={P_SOFT} />
      <rect x="34" y="44" width="132" height="34" rx="17" fill="white" stroke={LINE} />
      <circle cx="56" cy="61" r="7" stroke={P} strokeWidth="3" fill="none" />
      <path d="M61 66l5 5" stroke={P} strokeWidth="3" strokeLinecap="round" />
      <rect x="74" y="56" width="58" height="10" rx="5" fill={INK} opacity="0.85" />
      <rect x="138" y="52" width="20" height="18" rx="8" fill={P} />
      <rect x="44" y="88" width="112" height="46" rx="12" fill="white" stroke={LINE} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={54 + i * 34} y="98" width="26" height="26" rx="8" fill={[P_SOFT, TEAL_SOFT, "oklch(0.96 0.05 85)"][i]} />
          <circle cx={67 + i * 34} cy="111" r="5" fill={[P, TEAL, AMBER][i]} />
        </g>
      ))}
    </svg>
  );
}

export function LocationSpot({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden>
      <circle cx="100" cy="78" r="64" fill={TEAL_SOFT} />
      <rect x="40" y="36" width="120" height="90" rx="16" fill="white" stroke={LINE} />
      <path d="M40 80 H160 M100 36 V126" stroke={LINE} strokeWidth="6" />
      <rect x="48" y="44" width="44" height="28" rx="6" fill="oklch(0.93 0.05 160)" />
      <circle cx="100" cy="80" r="30" fill="oklch(0.53 0.2 266 / 0.1)" stroke="oklch(0.53 0.2 266 / 0.35)" strokeDasharray="4 4" />
      <g transform="translate(100 82)">
        <path d="M0 0c-11-13-17-20-17-29a17 17 0 0 1 34 0c0 9-6 16-17 29Z" fill={P} />
        <circle cx="0" cy="-29" r="7" fill="white" />
      </g>
      <circle cx="136" cy="106" r="6" fill={GREEN} />
      <circle cx="64" cy="104" r="6" fill={GREEN} />
    </svg>
  );
}

export function CallSpot({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden>
      <circle cx="100" cy="78" r="64" fill="oklch(0.96 0.035 165)" />
      <rect x="68" y="22" width="64" height="112" rx="14" fill={INK} />
      <rect x="73" y="28" width="54" height="100" rx="10" fill="white" />
      <circle cx="100" cy="58" r="14" fill={P_SOFT} />
      <text x="100" y="63" textAnchor="middle" fontSize="12" fontWeight="700" fill={P}>ST</text>
      <rect x="84" y="78" width="32" height="6" rx="3" fill={INK} opacity="0.8" />
      <rect x="88" y="89" width="24" height="5" rx="2.5" fill={LINE} />
      <circle cx="100" cy="112" r="10" fill={GREEN} />
      <path d="M96 108.2c.3-.3.8-.3 1 .1l.9 1.4c.2.3.1.6-.1.9l-.5.5c.4.8 1 1.4 1.8 1.8l.5-.5c.3-.3.6-.3.9-.1l1.4.9c.4.2.4.7.1 1l-.7.7c-.4.4-1.1.5-1.7.3-1.6-.8-2.9-2.1-3.7-3.7-.2-.6-.1-1.3.3-1.7Z" fill="white" />
      <path d="M140 52 q10 10 0 22 M148 44 q18 18 0 38" stroke={GREEN} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M60 52 q-10 10 0 22 M52 44 q-18 18 0 38" stroke={GREEN} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function CompareSpot({ className }: Props) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden>
      <circle cx="100" cy="78" r="64" fill="oklch(0.96 0.05 85)" />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${36 + i * 66} ${34 + i * 16})`}>
          <rect width="62" height="84" rx="12" fill="white" stroke={LINE} />
          <rect x="10" y="10" width="20" height="20" rx="6" fill={i ? TEAL_SOFT : P_SOFT} />
          <rect x="10" y="38" width="42" height="6" rx="3" fill={INK} opacity="0.8" />
          <rect x="10" y="50" width="30" height="5" rx="2.5" fill={LINE} />
          {[0, 1, 2, 3, 4].map((s) => (
            <path key={s} transform={`translate(${14 + s * 9} 66)`} d="M0-4l1.2 2.5 2.8.4-2 1.9.5 2.8L0 2.3-2.5 3.6-2 .8-4-1.1l2.8-.4Z" fill={s < 4 + i ? AMBER : LINE} />
          ))}
        </g>
      ))}
      <circle cx="160" cy="36" r="14" fill={GREEN} />
      <path d="M154 36l4 4 8-8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyResultsIllustration({ className }: Props) {
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden>
      <ellipse cx="120" cy="160" rx="84" ry="10" fill="oklch(0.94 0.01 258)" />
      <rect x="44" y="30" width="152" height="112" rx="18" fill="white" stroke={LINE} />
      <path d="M44 86 H196 M120 30 V142" stroke={LINE} strokeWidth="8" />
      <circle cx="120" cy="86" r="40" fill="oklch(0.53 0.2 266 / 0.06)" stroke="oklch(0.53 0.2 266 / 0.3)" strokeDasharray="5 5" />
      <circle cx="112" cy="80" r="20" fill="white" stroke={P} strokeWidth="6" />
      <path d="M126 94l18 18" stroke={P} strokeWidth="8" strokeLinecap="round" />
      <path d="M105 80h14" stroke={P} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function TrustIllustration({ className }: Props) {
  return (
    <svg viewBox="0 0 320 260" className={className} aria-hidden>
      <circle cx="160" cy="130" r="118" fill={P_SOFT} />
      <rect x="40" y="56" width="120" height="74" rx="16" fill="white" stroke={LINE} />
      <rect x="54" y="70" width="28" height="28" rx="9" fill={TEAL_SOFT} />
      <rect x="90" y="72" width="56" height="8" rx="4" fill={INK} opacity="0.8" />
      <rect x="90" y="86" width="40" height="6" rx="3" fill={LINE} />
      <rect x="54" y="108" width="50" height="12" rx="6" fill="oklch(0.96 0.035 165)" />
      <rect x="176" y="150" width="112" height="70" rx="16" fill="white" stroke={LINE} />
      {[0, 1, 2, 3, 4].map((s) => (
        <path key={s} transform={`translate(${196 + s * 16} 172)`} d="M0-6l1.8 3.7 4.1.6-3 2.9.7 4.1L0 3.4-3.6 5.3l.7-4.1-3-2.9 4.1-.6Z" fill={AMBER} />
      ))}
      <rect x="190" y="190" width="80" height="6" rx="3" fill={LINE} />
      <rect x="190" y="202" width="56" height="6" rx="3" fill={LINE} />
      <path d="M160 40 l62 22 v48 c0 42 -28 70 -62 84 c-34 -14 -62 -42 -62 -84 v-48Z" fill={P} />
      <path d="M160 58 l44 16 v36 c0 30 -20 50 -44 60 c-24 -10 -44 -30 -44 -60 v-36Z" fill="oklch(0.6 0.19 266)" />
      <path d="M140 116 l14 14 28 -30" stroke="white" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
