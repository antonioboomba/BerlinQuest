/** Silueta de Berlín: Fernsehturm, Brandenburger Tor, Oberbaumbrücke y bloques. */
export function Skyline({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 140" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="sky-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#a855f7" stopOpacity="0.55" />
          <stop offset="1" stopColor="#12121d" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <g fill="url(#sky-fade)">
        {/* bloques izquierda */}
        <rect x="0" y="92" width="26" height="48" />
        <rect x="28" y="78" width="22" height="62" />
        <rect x="52" y="98" width="18" height="42" />
        {/* Brandenburger Tor */}
        <rect x="76" y="96" width="62" height="8" />
        <rect x="80" y="104" width="6" height="36" />
        <rect x="92" y="104" width="6" height="36" />
        <rect x="104" y="104" width="6" height="36" />
        <rect x="116" y="104" width="6" height="36" />
        <rect x="128" y="104" width="6" height="36" />
        <rect x="98" y="86" width="18" height="10" />
        {/* bloques centro */}
        <rect x="144" y="84" width="30" height="56" />
        <rect x="176" y="100" width="20" height="40" />
        {/* Fernsehturm */}
        <rect x="216" y="20" width="3" height="40" />
        <circle cx="217.5" cy="66" r="11" />
        <rect x="213" y="76" width="9" height="64" />
        <rect x="200" y="124" width="36" height="16" />
        {/* bloques derecha */}
        <rect x="244" y="88" width="24" height="52" />
        <rect x="270" y="70" width="16" height="70" />
        {/* Oberbaumbrücke */}
        <path d="M290 112 h110 v8 h-110 z" />
        <rect x="318" y="88" width="10" height="24" />
        <rect x="362" y="88" width="10" height="24" />
        <path d="M296 120 q12 -12 24 0 M324 120 q12 -12 24 0 M352 120 q12 -12 24 0 M380 120 q12 -12 20 0" stroke="#a855f7" strokeOpacity="0.5" fill="none" />
        <rect x="290" y="120" width="110" height="20" />
      </g>
      {/* luz roja de la antena */}
      <circle cx="217.5" cy="19" r="2" fill="#ff4d6d" className="animate-blink" />
      {/* ventanas */}
      <g fill="#39ff88" opacity="0.7">
        <rect x="33" y="86" width="3" height="3" />
        <rect x="41" y="98" width="3" height="3" />
        <rect x="150" y="92" width="3" height="3" />
        <rect x="164" y="108" width="3" height="3" />
        <rect x="250" y="96" width="3" height="3" />
        <rect x="274" y="80" width="3" height="3" />
      </g>
    </svg>
  );
}
