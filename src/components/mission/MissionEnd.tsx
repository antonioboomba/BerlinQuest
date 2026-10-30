import { ITEMS } from '../../data/items';
import { formatEuro } from '../../engine/dialogue';
import type { EndNode, Objective } from '../../engine/types';
import { Button, Stars } from '../ui';

export interface MissionResult {
  node: EndNode;
  summary: string;
  stars: number;
  accuracy: number;
  answerXp: number;
  endXp: number;
  moneyDelta: number;
  newItems: string[];
  words: number;
  objectives: string[];
}

export function MissionEnd({
  result,
  objectivesDef,
  onMap,
  onVocab,
}: {
  result: MissionResult;
  objectivesDef: Objective[];
  onMap: () => void;
  onVocab: () => void;
}) {
  const r = result;
  return (
    <div className="animate-pop glow-acid mt-4 rounded-2xl border border-acid/40 bg-panel p-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-acid">Misión completada</p>
      <h2 className="mt-2 font-display text-3xl font-black">{r.node.title}</h2>
      <Stars n={r.stars} className="mt-2 block text-4xl" />
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/80">{r.summary}</p>

      <div className="mt-5 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
        <Stat label="XP total" value={`+${r.endXp + r.answerXp}`} accent="text-acid" />
        <Stat label="Precisión" value={`${Math.round(r.accuracy * 100)} %`} />
        <Stat label="Palabras" value={`+${r.words}`} accent="text-violet" />
        <Stat label="Dinero" value={`${r.moneyDelta >= 0 ? '+' : ''}${formatEuro(r.moneyDelta)}`} accent={r.moneyDelta < 0 ? 'text-red-300' : 'text-amber-200'} />
      </div>

      {r.newItems.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Objetos obtenidos</p>
          <div className="flex flex-wrap justify-center gap-2">
            {r.newItems.map((id) => (
              <span key={id} className="rounded-xl border border-line bg-panel2 px-3 py-1.5 text-sm">
                {ITEMS[id]?.emoji} {ITEMS[id]?.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <ul className="mx-auto mt-4 max-w-sm space-y-1 text-left text-sm">
        {objectivesDef.map((o) => {
          const done = r.objectives.includes(o.id);
          return (
            <li key={o.id} className={done ? 'text-acid' : 'text-white/40'}>
              {done ? '✔' : '✗'} {o.text}
              {o.optional && <span className="text-xs text-muted"> (opcional)</span>}
            </li>
          );
        })}
      </ul>

      {r.stars < 3 && (
        <p className="mt-4 text-xs text-muted">
          Consejo: repite la misión para conseguir 3 estrellas. {r.objectives.includes('klaus') ? '' : 'Y prueba a hablar con todo el mundo…'}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="violet" onClick={onVocab}>
          📚 Repasar vocabulario
        </Button>
        <Button variant="primary" onClick={onMap}>
          🗺️ Volver al mapa
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = 'text-white' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink/50 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`font-mono text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}
