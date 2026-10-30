import { useState } from 'react';
import { Button, Panel, Pill, Stars } from '../components/ui';
import { LOCATIONS } from '../data/locations';
import { MISSIONS } from '../data/missions';
import { isLocationUnlocked, unlockLabel } from '../engine/progression';
import type { Location } from '../engine/types';
import { useGame } from '../GameContext';

const DISTRICTS: { name: string; points: string; lx: number; ly: number }[] = [
  { name: 'MITTE', points: '70,40 225,28 238,96 214,148 118,158 62,108', lx: 120, ly: 64 },
  { name: 'FRIEDRICHSHAIN', points: '225,28 372,48 380,138 262,160 214,148 238,96', lx: 300, ly: 66 },
  { name: 'KREUZBERG', points: '118,158 214,148 262,160 304,186 252,212 112,216', lx: 150, ly: 202 },
  { name: 'NEUKÖLLN', points: '112,216 252,212 304,186 340,288 128,292', lx: 182, ly: 282 },
];

export function MapScreen({ onStartMission }: { onStartMission: (id: string) => void }) {
  const { state } = useGame();
  const [selected, setSelected] = useState<string>('mitte');
  const loc = LOCATIONS.find((l) => l.id === selected)!;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl font-black">Berlin</h1>
            <p className="text-sm text-muted">Elige un lugar. Completa misiones para desbloquear barrios.</p>
          </div>
        </div>
        <Panel className="grid-bg overflow-hidden p-2">
          <svg viewBox="0 0 400 300" className="h-auto w-full" role="group" aria-label="Mapa de Berlín">
            {/* distritos */}
            {DISTRICTS.map((d) => (
              <g key={d.name}>
                <polygon points={d.points} fill="#a855f7" fillOpacity="0.06" stroke="#a855f7" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
                <text x={d.lx} y={d.ly} fill="#8d8daa" fontSize="9" fontFamily="monospace" letterSpacing="2">
                  {d.name}
                </text>
              </g>
            ))}
            {/* Tiergarten y Tempelhofer Feld */}
            <ellipse cx="60" cy="122" rx="40" ry="16" fill="#39ff88" fillOpacity="0.1" />
            <text x="34" y="125" fill="#39ff88" fillOpacity="0.5" fontSize="7" fontFamily="monospace">Tiergarten</text>
            <rect x="60" y="232" width="62" height="44" rx="10" fill="#39ff88" fillOpacity="0.08" />
            <text x="64" y="258" fill="#39ff88" fillOpacity="0.5" fontSize="7" fontFamily="monospace">Tempelhofer F.</text>
            {/* Spree y Landwehrkanal */}
            <path d="M0 108 C40 96 90 92 130 110 S200 150 262 160 S330 196 400 232" fill="none" stroke="#3b82f6" strokeOpacity="0.55" strokeWidth="7" strokeLinecap="round" />
            <text x="300" y="196" fill="#60a5fa" fillOpacity="0.7" fontSize="8" fontStyle="italic" transform="rotate(25 300 196)">Spree</text>
            <path d="M40 150 C100 176 170 186 240 192 S300 190 320 196" fill="none" stroke="#3b82f6" strokeOpacity="0.3" strokeWidth="2.5" />
            {/* U-Bahn U8 */}
            <path d="M175 20 L172 110 L200 180 L228 236 L236 296" fill="none" stroke="#0ea5e9" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="1 4" strokeLinecap="round" />
            {/* Fernsehturm */}
            <g transform="translate(196 74)" opacity="0.8">
              <rect x="-1" y="-18" width="2" height="22" fill="#ecebf5" />
              <circle cx="0" cy="-8" r="4" fill="#ecebf5" />
              <circle cx="0" cy="-19" r="1.2" fill="#ff4d6d" className="animate-blink" />
            </g>
            {/* ubicaciones */}
            {LOCATIONS.map((l) => (
              <MapPin key={l.id} loc={l} unlocked={isLocationUnlocked(l, state)} done={!!state.missions[l.missionId]?.completed} active={selected === l.id} onSelect={() => setSelected(l.id)} />
            ))}
          </svg>
        </Panel>

        {/* lista accesible / móvil */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOCATIONS.map((l) => {
            const unlocked = isLocationUnlocked(l, state);
            return (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                className={`rounded-xl border p-2.5 text-left text-sm transition ${selected === l.id ? 'border-acid bg-acid/5' : 'border-line hover:border-white/30'} ${unlocked ? '' : 'opacity-60'}`}
              >
                <span className="mr-1">{unlocked ? l.emoji : '🔒'}</span>
                <span className="font-semibold">{l.district}</span>
                <span className="block truncate text-xs text-muted">{l.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <LocationPanel loc={loc} onStart={onStartMission} />
    </div>
  );
}

function MapPin({ loc, unlocked, done, active, onSelect }: { loc: Location; unlocked: boolean; done: boolean; active: boolean; onSelect: () => void }) {
  const color = !unlocked ? '#4b4b63' : done ? '#a855f7' : '#39ff88';
  return (
    <g
      transform={`translate(${loc.x} ${loc.y})`}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      tabIndex={0}
      role="button"
      aria-label={`${loc.name}, ${loc.district}${unlocked ? '' : ' (bloqueado)'}`}
      className="cursor-pointer outline-none"
    >
      {unlocked && !done && (
        <circle r="14" fill={color} fillOpacity="0.25">
          <animate attributeName="r" values="12;20;12" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
      <circle r={active ? 15 : 12.5} fill="#12121d" stroke={color} strokeWidth={active ? 3 : 2} />
      <text textAnchor="middle" dominantBaseline="central" fontSize="13">
        {unlocked ? loc.emoji : '🔒'}
      </text>
      {done && (
        <text x="10" y="-9" fontSize="9">
          ✅
        </text>
      )}
    </g>
  );
}

function LocationPanel({ loc, onStart }: { loc: Location; onStart: (id: string) => void }) {
  const { state } = useGame();
  const mission = MISSIONS[loc.missionId];
  const unlocked = isLocationUnlocked(loc, state);
  const record = state.missions[mission.id];

  return (
    <Panel key={loc.id} className="animate-rise flex flex-col gap-4 self-start p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">{unlocked ? loc.emoji : '🔒'}</span>
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-violet">{loc.district}</p>
          <h2 className="font-display text-xl font-bold">{loc.name}</h2>
        </div>
      </div>
      <p className="text-sm text-white/80">{loc.blurb}</p>

      <div className="rounded-xl border border-line bg-ink/50 p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-display font-bold">{mission.title}</h3>
          <Pill>{mission.cefr}</Pill>
        </div>
        <p className="text-xs text-muted">{mission.subtitle}</p>
        <p className="mt-2 text-sm text-white/80">{mission.description}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {mission.objectives.map((o) => (
            <li key={o.id} className="flex gap-2 text-white/75">
              <span className="text-acid">{o.optional ? '◇' : '◆'}</span>
              {o.text}
              {o.optional && <span className="text-xs text-muted">(opcional)</span>}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mission.rewardsPreview.map((r) => (
            <Pill key={r}>{r}</Pill>
          ))}
        </div>
      </div>

      {record && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {record.completed ? 'Completada' : 'Sin completar'} · {record.attempts} intento{record.attempts === 1 ? '' : 's'}
          </span>
          <Stars n={record.bestStars} />
        </div>
      )}

      {!unlocked ? (
        <p className="rounded-xl border border-line p-3 text-center text-sm text-muted">🔒 {unlockLabel(loc, (id) => MISSIONS[id]?.title ?? id)}</p>
      ) : !mission.playable ? (
        <p className="rounded-xl border border-violet/40 bg-violet/5 p-3 text-center text-sm text-violet">🚧 Próximamente — misión en construcción</p>
      ) : (
        <Button variant="primary" className="py-3" onClick={() => onStart(mission.id)}>
          {record?.completed ? 'Volver a jugar' : 'Empezar misión'} →
        </Button>
      )}
    </Panel>
  );
}
