import { useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Skyline } from '../components/Skyline';
import { Button } from '../components/ui';
import { levelFromXp } from '../engine/progression';
import { importSave } from '../engine/storage';
import { useGame } from '../GameContext';

export function WelcomeScreen({ onNew, onContinue }: { onNew: () => void; onContinue: () => void }) {
  const { state, dispatch } = useGame();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [confirmNew, setConfirmNew] = useState(false);

  const onImport = async (f?: File) => {
    if (!f) return;
    const s = await importSave(f);
    if (!s?.player) return setError('Ese archivo no es una partida válida de Berlin Quest.');
    dispatch({ type: 'LOAD', state: s });
    onContinue();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-40 pt-10">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <p className="animate-rise mb-3 font-mono text-xs uppercase tracking-[0.35em] text-acid">Ein Sprach-RPG</p>
        <h1 className="animate-rise font-display text-5xl font-black leading-none tracking-tight sm:text-6xl" style={{ animationDelay: '80ms' }}>
          BERLIN
          <span className="block bg-gradient-to-r from-acid to-violet bg-clip-text text-transparent">QUEST</span>
        </h1>
        <p className="animate-rise mt-3 font-mono text-sm text-muted" style={{ animationDelay: '160ms' }}>
          Learn to Survive
        </p>
        <p className="animate-rise mt-6 max-w-sm text-sm leading-relaxed text-white/80" style={{ animationDelay: '240ms' }}>
          Acabas de mudarte a Berlín. Empadrónate, consigue trabajo, sobrevive a tu WG y toca en un club. Todo en alemán, de A1 a B2.
        </p>

        <div className="animate-rise mt-8 flex w-full flex-col gap-3" style={{ animationDelay: '320ms' }}>
          {state.player && (
            <button
              onClick={onContinue}
              className="glow-acid flex items-center gap-3 rounded-2xl border border-acid/40 bg-panel/90 p-3 text-left transition hover:bg-panel2"
            >
              <Avatar a={state.player.appearance} size={52} />
              <span className="flex-1">
                <span className="block font-semibold">Continuar partida</span>
                <span className="block text-xs text-muted">
                  {state.player.firstName} · Nivel {levelFromXp(state.xp).level} · {state.settings.level} · {Object.keys(state.vocab).length} palabras
                </span>
              </span>
              <span className="text-acid">▶</span>
            </button>
          )}
          {confirmNew ? (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-3 text-sm">
              <p className="mb-3">Empezar de nuevo sobrescribirá tu partida actual. ¿Seguro?</p>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirmNew(false)}>Cancelar</Button>
                <Button variant="danger" className="flex-1" onClick={onNew}>Sí, nueva partida</Button>
              </div>
            </div>
          ) : (
            <Button variant={state.player ? 'secondary' : 'primary'} className="py-3 text-base" onClick={() => (state.player ? setConfirmNew(true) : onNew())}>
              Nueva partida
            </Button>
          )}
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Importar partida (.json)
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </div>
      <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full" />
    </div>
  );
}
