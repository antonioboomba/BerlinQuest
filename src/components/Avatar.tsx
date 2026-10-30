import type { Appearance } from '../engine/types';

/** Avatar vectorial sencillo: cabeza, pelo, ropa y accesorio. */
export function Avatar({ a, size = 64, className = '' }: { a: Appearance; size?: number; className?: string }) {
  const hair = a.hair;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <clipPath id="av-clip">
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#1a1a29" stroke="#2a2a3f" strokeWidth="2" />
      <g clipPath="url(#av-clip)">
        {/* pelo largo por detrás */}
        {a.hairStyle === 'long' && <path d="M24 40 Q22 80 30 92 L70 92 Q78 80 76 40 Z" fill={hair} />}
        {/* cuerpo */}
        <path d="M18 100 Q20 72 50 70 Q80 72 82 100 Z" fill={a.outfit} />
        <path d="M42 71 L50 80 L58 71" fill="none" stroke="rgb(0 0 0 / .25)" strokeWidth="2" />
        {/* cuello y cabeza */}
        <rect x="43" y="58" width="14" height="14" rx="4" fill={a.skin} />
        <ellipse cx="50" cy="44" rx="20" ry="22" fill={a.skin} />
        {/* ojos y boca */}
        <circle cx="42.5" cy="46" r="2.2" fill="#14141c" />
        <circle cx="57.5" cy="46" r="2.2" fill="#14141c" />
        <path d="M44 55 Q50 59 56 55" fill="none" stroke="#14141c" strokeWidth="1.8" strokeLinecap="round" />
        {/* peinados */}
        {a.hairStyle === 'short' && <path d="M29 40 Q30 20 50 20 Q72 20 71 40 Q64 30 50 30 Q38 30 29 40 Z" fill={hair} />}
        {a.hairStyle === 'long' && <path d="M29 44 Q28 20 50 20 Q72 20 71 44 Q66 30 50 29 Q36 30 29 44 Z" fill={hair} />}
        {a.hairStyle === 'buzz' && <path d="M31 36 Q34 22 50 22 Q66 22 69 36 Q60 29 50 29 Q40 29 31 36 Z" fill={hair} opacity="0.85" />}
        {a.hairStyle === 'curly' && (
          <g fill={hair}>
            {[30, 38, 46, 54, 62, 70].map((x, i) => (
              <circle key={x} cx={x} cy={i % 2 ? 24 : 28} r="8" />
            ))}
            <circle cx="28" cy="36" r="6" />
            <circle cx="72" cy="36" r="6" />
          </g>
        )}
        {a.hairStyle === 'bun' && (
          <g fill={hair}>
            <circle cx="50" cy="14" r="8" />
            <path d="M29 40 Q30 21 50 21 Q70 21 71 40 Q63 29 50 29 Q37 29 29 40 Z" />
          </g>
        )}
        {/* accesorios */}
        {a.accessory === 'glasses' && (
          <g fill="none" stroke="#39ff88" strokeWidth="2">
            <circle cx="42.5" cy="46" r="5.5" />
            <circle cx="57.5" cy="46" r="5.5" />
            <path d="M48 46 L52 46" />
          </g>
        )}
        {a.accessory === 'beanie' && (
          <g>
            <path d="M28 36 Q28 14 50 14 Q72 14 72 36 Z" fill="#a855f7" />
            <rect x="26" y="32" width="48" height="7" rx="3" fill="#7e3cc4" />
          </g>
        )}
        {a.accessory === 'earring' && <circle cx="30.5" cy="52" r="2" fill="#39ff88" />}
      </g>
    </svg>
  );
}
