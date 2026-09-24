/* Hero: a person checking nearby providers on their phone, over a stylised city map with pins. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 500" className={className} role="img" aria-label="A person finding nearby service providers on a map using their phone">
      <defs>
        <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.94 0.04 266)" />
          <stop offset="1" stopColor="oklch(0.95 0.04 195)" />
        </linearGradient>
        <linearGradient id="hero-phone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.3 0.08 268)" />
          <stop offset="1" stopColor="oklch(0.22 0.06 268)" />
        </linearGradient>
        <filter id="hero-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="oklch(0.3 0.1 266)" floodOpacity="0.16" />
        </filter>
        <clipPath id="hero-map-clip">
          <rect x="30" y="50" width="370" height="330" rx="28" />
        </clipPath>
      </defs>

      {/* soft backdrop */}
      <circle cx="300" cy="250" r="230" fill="url(#hero-bg)" />

      {/* map card */}
      <g filter="url(#hero-shadow)">
        <rect x="30" y="50" width="370" height="330" rx="28" fill="white" />
      </g>
      <g clipPath="url(#hero-map-clip)">
        <rect x="30" y="50" width="370" height="330" fill="oklch(0.975 0.008 250)" />
        {/* blocks */}
        <rect x="52" y="72" width="96" height="70" rx="10" fill="oklch(0.94 0.012 255)" />
        <rect x="172" y="72" width="130" height="70" rx="10" fill="oklch(0.94 0.012 255)" />
        <rect x="52" y="166" width="70" height="92" rx="10" fill="oklch(0.93 0.05 160)" />
        <rect x="146" y="166" width="104" height="92" rx="10" fill="oklch(0.94 0.012 255)" />
        <rect x="52" y="282" width="130" height="80" rx="10" fill="oklch(0.94 0.012 255)" />
        <rect x="206" y="282" width="96" height="80" rx="10" fill="oklch(0.94 0.012 255)" />
        <rect x="326" y="72" width="60" height="110" rx="10" fill="oklch(0.93 0.05 160)" />
        {/* river */}
        <path d="M280 380 C 300 320, 360 300, 400 250" stroke="oklch(0.88 0.06 220)" strokeWidth="22" fill="none" strokeLinecap="round" />
        {/* roads */}
        <path d="M30 154 H400 M30 270 H400 M160 50 V380 M314 50 V380" stroke="white" strokeWidth="12" />
        <path d="M30 154 H400 M30 270 H400 M160 50 V380 M314 50 V380" stroke="oklch(0.9 0.01 255)" strokeWidth="1.5" strokeDasharray="6 8" />
        {/* route */}
        <path d="M110 226 C 140 226, 160 210, 160 190 S 200 154, 236 154 S 262 118, 262 104" stroke="oklch(0.53 0.2 266)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
        {/* search radius */}
        <circle cx="110" cy="226" r="62" fill="oklch(0.53 0.2 266 / 0.08)" stroke="oklch(0.53 0.2 266 / 0.3)" strokeWidth="1.5" strokeDasharray="4 5" />
        {/* you are here */}
        <circle cx="110" cy="226" r="11" fill="white" />
        <circle cx="110" cy="226" r="7" fill="oklch(0.53 0.2 266)" />
        {/* provider pins */}
        <g transform="translate(262 104)">
          <path d="M0 0c-10-12-16-19-16-27a16 16 0 0 1 32 0c0 8-6 15-16 27Z" fill="oklch(0.6 0.13 165)" />
          <circle cx="0" cy="-27" r="6.5" fill="white" />
        </g>
        <g transform="translate(206 234)">
          <path d="M0 0c-8-10-13-15-13-22a13 13 0 0 1 26 0c0 7-5 12-13 22Z" fill="oklch(0.53 0.2 266)" />
          <circle cx="0" cy="-22" r="5" fill="white" />
        </g>
        <g transform="translate(94 330)">
          <path d="M0 0c-8-10-13-15-13-22a13 13 0 0 1 26 0c0 7-5 12-13 22Z" fill="oklch(0.53 0.2 266)" />
          <circle cx="0" cy="-22" r="5" fill="white" />
        </g>
        <g transform="translate(356 214)">
          <path d="M0 0c-8-10-13-15-13-22a13 13 0 0 1 26 0c0 7-5 12-13 22Z" fill="oklch(0.53 0.2 266)" />
          <circle cx="0" cy="-22" r="5" fill="white" />
        </g>
      </g>

      {/* floating rating chip */}
      <g filter="url(#hero-shadow)">
        <rect x="200" y="20" width="150" height="54" rx="16" fill="white" />
      </g>
      <rect x="214" y="34" width="26" height="26" rx="8" fill="oklch(0.97 0.04 85)" />
      <path d="M227 39.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" fill="oklch(0.76 0.15 72)" />
      <text x="250" y="46" fontSize="14" fontWeight="700" fill="oklch(0.21 0.035 262)">4.8 rating</text>
      <text x="250" y="63" fontSize="11" fill="oklch(0.52 0.025 258)">126 reviews</text>

      {/* phone */}
      <g filter="url(#hero-shadow)">
        <rect x="318" y="118" width="200" height="362" rx="34" fill="url(#hero-phone)" />
      </g>
      <rect x="328" y="128" width="180" height="342" rx="26" fill="white" />
      <rect x="392" y="136" width="52" height="8" rx="4" fill="oklch(0.22 0.06 268)" />
      {/* search bar */}
      <rect x="342" y="160" width="152" height="34" rx="12" fill="oklch(0.968 0.006 255)" />
      <circle cx="359" cy="177" r="6" stroke="oklch(0.53 0.2 266)" strokeWidth="2.2" fill="none" />
      <path d="M363.5 181.5l4 4" stroke="oklch(0.53 0.2 266)" strokeWidth="2.2" strokeLinecap="round" />
      <text x="374" y="181" fontSize="12" fontWeight="600" fill="oklch(0.21 0.035 262)">TV Repair</text>
      <text x="342" y="216" fontSize="10.5" fontWeight="600" fill="oklch(0.52 0.025 258)">9 providers nearby</text>

      {/* result cards */}
      {[0, 1, 2].map((i) => {
        const y = 226 + i * 78;
        const tones = ["oklch(0.95 0.03 266)", "oklch(0.95 0.035 170)", "oklch(0.96 0.05 85)"];
        const fgs = ["oklch(0.53 0.2 266)", "oklch(0.55 0.11 170)", "oklch(0.6 0.13 70)"];
        return (
          <g key={i}>
            <rect x="342" y={y} width="152" height="68" rx="14" fill="white" stroke="oklch(0.915 0.01 258)" />
            <rect x="352" y={y + 12} width="30" height="30" rx="9" fill={tones[i]} />
            <rect x="360" y={y + 22} width="14" height="10" rx="2" fill="none" stroke={fgs[i]} strokeWidth="2" />
            <rect x="390" y={y + 13} width={i === 1 ? 70 : 82} height="7" rx="3.5" fill="oklch(0.3 0.04 262)" />
            <rect x="390" y={y + 26} width="52" height="6" rx="3" fill="oklch(0.85 0.01 258)" />
            <rect x="390" y={y + 38} width="28" height="12" rx="4" fill="oklch(0.55 0.13 160)" />
            <text x="394" y={y + 47.5} fontSize="8.5" fontWeight="700" fill="white">{["4.8", "4.6", "4.5"][i]}</text>
            <rect x="352" y={y + 50} width="58" height="10" rx="5" fill="oklch(0.96 0.035 165)" />
            <circle cx="359" cy={y + 55} r="2.5" fill="oklch(0.6 0.13 165)" />
            <rect x="452" y={y + 36} width="32" height="22" rx="8" fill="oklch(0.53 0.2 266)" />
            <path
              d={`M${462} ${y + 42}c.4-.4 1-.3 1.3.1l1.2 1.9c.2.4.2.8-.1 1.1l-.7.6c.5 1 1.3 1.9 2.4 2.4l.6-.7c.3-.3.8-.4 1.1-.1l1.9 1.2c.4.3.5.9.1 1.3l-.9.9c-.6.6-1.5.7-2.3.4-2.2-1.1-4-2.9-5.1-5.1-.3-.8-.2-1.7.4-2.3Z`}
              fill="white"
            />
          </g>
        );
      })}

      {/* person */}
      <g transform="translate(18 250)">
        {/* legs */}
        <path d="M66 170 L60 236" stroke="oklch(0.27 0.09 268)" strokeWidth="16" strokeLinecap="round" />
        <path d="M92 170 L100 236" stroke="oklch(0.27 0.09 268)" strokeWidth="16" strokeLinecap="round" />
        <path d="M48 240 h22 a4 4 0 0 1 0 8 h-22 a4 4 0 0 1 0-8Z" fill="oklch(0.21 0.035 262)" />
        <path d="M92 240 h22 a4 4 0 0 1 0 8 h-22 a4 4 0 0 1 0-8Z" fill="oklch(0.21 0.035 262)" />
        {/* torso */}
        <path d="M44 100 q35 -24 72 0 l6 78 h-84Z" fill="oklch(0.7 0.12 190)" />
        {/* back arm */}
        <path d="M112 106 q24 26 34 14" stroke="oklch(0.7 0.12 190)" strokeWidth="15" strokeLinecap="round" fill="none" />
        {/* phone in hand */}
        <rect x="138" y="98" width="16" height="26" rx="4" fill="oklch(0.22 0.06 268)" transform="rotate(-18 146 111)" />
        <circle cx="146" cy="121" r="7" fill="oklch(0.78 0.08 55)" />
        {/* front arm */}
        <path d="M50 108 q-14 36 6 58" stroke="oklch(0.66 0.12 190)" strokeWidth="15" strokeLinecap="round" fill="none" />
        <circle cx="58" cy="168" r="7" fill="oklch(0.78 0.08 55)" />
        {/* neck + head */}
        <rect x="72" y="80" width="16" height="18" rx="6" fill="oklch(0.72 0.08 55)" />
        <circle cx="81" cy="62" r="24" fill="oklch(0.78 0.08 55)" />
        <path d="M57 60 q2 -30 28 -28 q22 2 20 26 q-10 -12 -26 -10 q-12 2 -22 12Z" fill="oklch(0.25 0.03 40)" />
        <circle cx="90" cy="64" r="2.2" fill="oklch(0.25 0.03 40)" />
        <path d="M86 74 q5 3 9 0" stroke="oklch(0.45 0.08 30)" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* open now chip */}
      <g filter="url(#hero-shadow)">
        <rect x="190" y="410" width="120" height="44" rx="14" fill="white" />
      </g>
      <circle cx="210" cy="432" r="6" fill="oklch(0.6 0.13 165)" />
      <circle cx="210" cy="432" r="11" fill="oklch(0.6 0.13 165 / 0.18)" />
      <text x="226" y="437" fontSize="13" fontWeight="700" fill="oklch(0.21 0.035 262)">Open now</text>
    </svg>
  );
}
