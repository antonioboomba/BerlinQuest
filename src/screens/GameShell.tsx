import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { SettingsModal } from '../components/SettingsModal';
import { ProgressBar } from '../components/ui';
import { formatEuro } from '../engine/dialogue';
import { levelFromXp } from '../engine/progression';
import { isDue } from '../engine/srs';
import { useGame } from '../GameContext';
import { MapScreen } from './MapScreen';
import { ProgressScreen } from './ProgressScreen';
import { VocabScreen } from './VocabScreen';

export type Tab = 'map' | 'progress' | 'vocab';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'map', label: 'Mapa', icon: '🗺️' },
  { id: 'vocab', label: 'Vocabulario', icon: '📚' },
  { id: 'progress', label: 'Progreso', icon: '📊' },
];

export function GameShell({
  tab,
  onTab,
  onStartMission,
  onExit,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onStartMission: (id: string) => void;
  onExit: () => void;
}) {
  const { state, lastSaved, saveError } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const player = state.player!;
  const lvl = levelFromXp(state.xp);
  const due = useMemo(() => Object.values(state.vocab).filter((c) => isDue(c)).length, [state.vocab]);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col pb-20 sm:pb-6">
      {/* HUD */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="shrink-0" title="Menú principal" aria-label="Menú principal">
            <Avatar a={player.appearance} size={44} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate font-display font-bold">{player.firstName}</span>
              <span className="rounded-md bg-acid/15 px-1.5 font-mono text-xs text-acid">Lv {lvl.level}</span>
              <span className="rounded-md bg-violet/15 px-1.5 font-mono text-xs text-violet">{state.settings.level}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ProgressBar value={lvl.into / lvl.needed} className="max-w-48 flex-1" />
              <span className="font-mono text-[11px] text-muted">
                {lvl.into}/{lvl.needed} XP
              </span>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="font-mono text-sm text-amber-200">{formatEuro(state.money)}</p>
            <p className="text-[11px] text-muted">{saveError ? '⚠️ No se pudo guardar' : lastSaved ? '✓ Guardado' : 'Autoguardado activo'}</p>
          </div>
          <nav className="ml-2 hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`relative rounded-lg px-3 py-2 text-sm transition ${tab === t.id ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}
              >
                {t.icon} {t.label}
                {t.id === 'vocab' && due > 0 && <Badge n={due} />}
              </button>
            ))}
          </nav>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg p-2 text-lg text-muted hover:bg-white/5 hover:text-white"
            aria-label="Ajustes"
            title="Ajustes"
          >
            ⚙️
          </button>
        </div>
        <p className="mt-2 font-mono text-xs text-amber-200 sm:hidden">{formatEuro(state.money)}</p>
      </header>

      <main className="flex-1 px-4 py-5">
        {tab === 'map' && <MapScreen onStartMission={onStartMission} />}
        {tab === 'vocab' && <VocabScreen />}
        {tab === 'progress' && <ProgressScreen />}
      </main>

      {/* Navegación inferior en móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-ink/95 backdrop-blur sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${tab === t.id ? 'text-acid' : 'text-muted'}`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
            {t.id === 'vocab' && due > 0 && <Badge n={due} />}
          </button>
        ))}
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute right-1 top-1 min-w-4 rounded-full bg-violet px-1 font-mono text-[10px] leading-4 text-white sm:-right-1 sm:-top-1">
      {n > 99 ? '99+' : n}
    </span>
  );
}
