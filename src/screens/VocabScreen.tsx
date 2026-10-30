import { useMemo, useState } from 'react';
import { Button, Panel, Pill, SpeakButton } from '../components/ui';
import { VOCAB, vocabLabel } from '../data/vocabulary';
import { checkCloze, normalize } from '../engine/evaluate';
import { describeDue, isDue, mastery, type Mastery } from '../engine/srs';
import type { SrsGrade, VocabItem } from '../engine/types';
import { useGame } from '../GameContext';
import { useSpeech } from '../hooks/useSpeech';

const MASTERY: Record<Mastery, { label: string; cls: string }> = {
  new: { label: 'Nueva', cls: 'text-sky-300 border-sky-300/40' },
  learning: { label: 'Aprendiendo', cls: 'text-amber-300 border-amber-300/40' },
  known: { label: 'Conocida', cls: 'text-violet border-violet/40' },
  mastered: { label: 'Dominada', cls: 'text-acid border-acid/40' },
};

export function VocabScreen() {
  const { state } = useGame();
  const [session, setSession] = useState<string[] | null>(null);
  const [query, setQuery] = useState('');

  const cards = Object.values(state.vocab);
  const due = cards.filter((c) => isDue(c));
  const counts = useMemo(() => {
    const c: Record<Mastery, number> = { new: 0, learning: 0, known: 0, mastered: 0 };
    for (const card of cards) c[mastery(card)]++;
    return c;
  }, [cards]);

  const list = cards
    .map((c) => ({ card: c, item: VOCAB[c.id] }))
    .filter(({ item }) => item && (!query || normalize(`${vocabLabel(item)} ${item.es} ${item.tags.join(' ')}`).includes(normalize(query))))
    .sort((a, b) => a.card.due - b.card.due);

  const start = (practice: boolean) => {
    const pool = practice ? [...cards].sort(() => Math.random() - 0.5).slice(0, 10) : [...due].sort((a, b) => a.due - b.due).slice(0, 20);
    setSession(pool.map((c) => c.id));
  };

  if (session) return <ReviewSession ids={session} onDone={() => setSession(null)} />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-black">Wortschatz</h1>
      <p className="text-sm text-muted">Las palabras que encuentras en las misiones entran aquí. La repetición espaciada te las vuelve a preguntar justo antes de que las olvides.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(MASTERY) as Mastery[]).map((m) => (
          <Panel key={m} className="p-3">
            <p className={`text-xs ${MASTERY[m].cls.split(' ')[0]}`}>{MASTERY[m].label}</p>
            <p className="font-mono text-2xl font-bold">{counts[m]}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left">
        <div className="flex-1">
          <p className="font-display text-lg font-bold">{due.length > 0 ? `${due.length} palabra${due.length > 1 ? 's' : ''} para repasar` : 'Todo al día ✨'}</p>
          <p className="text-sm text-muted">{cards.length === 0 ? 'Juega una misión para descubrir vocabulario.' : 'Unos minutos al día bastan.'}</p>
        </div>
        <div className="flex gap-2">
          {cards.length > 0 && (
            <Button onClick={() => start(true)} disabled={cards.length === 0}>
              Práctica libre
            </Button>
          )}
          <Button variant="primary" onClick={() => start(false)} disabled={due.length === 0}>
            Repasar ahora
          </Button>
        </div>
      </Panel>

      {cards.length > 0 && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en alemán, español o etiqueta…"
            className="mt-5 w-full rounded-xl border border-line bg-ink/60 px-3 py-2.5 text-sm outline-none focus:border-acid"
          />
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel/80">
            {list.map(({ card, item }) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <SpeakButton text={item.article ? `${item.article} ${item.de}` : item.de} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold" lang="de">
                    {item.article && <span className={ARTICLE_CLS[item.article]}>{item.article} </span>}
                    {item.de}
                    {item.plural && <span className="ml-1 text-xs font-normal text-muted">(pl. {item.plural})</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{item.es}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${MASTERY[mastery(card)].cls}`}>{MASTERY[mastery(card)].label}</span>
                  <p className="mt-1 text-[11px] text-muted">{describeDue(card)}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Colores por género: ayuda visual clásica para memorizar artículos. */
const ARTICLE_CLS = { der: 'text-sky-300', die: 'text-rose-300', das: 'text-emerald-300' } as const;

type Mode = 'flip' | 'write';

function ReviewSession({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { dispatch } = useGame();
  const { speak, enabled } = useSpeech();
  const [queue, setQueue] = useState(ids);
  const [mode, setMode] = useState<Mode>('flip');
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string; grade: SrsGrade } | null>(null);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);

  const item: VocabItem | undefined = VOCAB[queue[0]];
  const total = done + queue.length;

  if (!item) {
    return (
      <Panel className="animate-pop mx-auto max-w-md p-8 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="mt-2 font-display text-2xl font-black">Sitzung beendet!</h2>
        <p className="mt-2 text-muted">
          {done} repasos · {correct} acertados
        </p>
        <Button variant="primary" className="mt-6" onClick={onDone}>
          Volver
        </Button>
      </Panel>
    );
  }

  const label = vocabLabel(item);
  const grade = (g: SrsGrade) => {
    dispatch({ type: 'REVIEW_CARD', id: item.id, grade: g });
    setDone((d) => d + 1);
    if (g > 0) setCorrect((c) => c + 1);
    // "Otra vez" la reencola al final de esta sesión.
    setQueue((q) => (g === 0 ? [...q.slice(1), q[0]] : q.slice(1)));
    setRevealed(false);
    setTyped('');
    setVerdict(null);
  };

  const check = () => {
    const t = typed.trim();
    if (!t) return;
    const full = checkCloze(t, [label]);
    if (full.status === 'correct') return setVerdict({ ok: true, text: full.note ?? '¡Perfecto!', grade: 2 });
    if (full.status === 'typo') return setVerdict({ ok: true, text: full.note, grade: 1 });
    if (item.article) {
      const noArticle = checkCloze(t.replace(/^(der|die|das)\s+/i, ''), [item.de]);
      if (noArticle.status !== 'wrong') {
        const given = t.match(/^(der|die|das)\s+/i)?.[1]?.toLowerCase();
        return setVerdict({
          ok: false,
          text: given ? `Palabra bien, artículo mal: es «${item.article}».` : `Falta el artículo: «${label}». Apréndelos siempre juntos.`,
          grade: 1,
        });
      }
    }
    setVerdict({ ok: false, text: `Era «${label}».`, grade: 0 });
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onDone} className="text-sm text-muted hover:text-white">
          ← Salir
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-acid transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <div className="flex rounded-lg border border-line text-xs">
          {(['flip', 'write'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setRevealed(false);
                setVerdict(null);
              }}
              className={`px-2.5 py-1 ${mode === m ? 'bg-white/10 text-white' : 'text-muted'}`}
            >
              {m === 'flip' ? 'Tarjeta' : 'Escribir'}
            </button>
          ))}
        </div>
      </div>

      <Panel key={`${item.id}-${done}`} className="animate-pop p-6 text-center">
        <div className="mb-3 flex justify-center gap-1">
          {item.tags.slice(0, 2).map((t) => (
            <Pill key={t}>{t}</Pill>
          ))}
          <Pill>{item.cefr}</Pill>
        </div>

        {mode === 'flip' ? (
          <>
            <p className="font-display text-3xl font-black" lang="de">
              {item.article && <span className={ARTICLE_CLS[item.article]}>{item.article} </span>}
              {item.de}
            </p>
            {enabled && (
              <button onClick={() => speak(label)} className="mt-2 text-sm text-muted hover:text-white">
                🔊 Escuchar
              </button>
            )}
            {revealed ? (
              <Answer item={item} />
            ) : (
              <Button variant="secondary" className="mt-6 w-full" onClick={() => setRevealed(true)} autoFocus>
                Mostrar significado
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted">¿Cómo se dice en alemán?</p>
            <p className="mt-1 font-display text-2xl font-bold">{item.es}</p>
            {item.article && <p className="mt-1 text-xs text-muted">(con artículo)</p>}
            <input
              autoFocus
              value={typed}
              disabled={!!verdict}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (verdict ? grade(verdict.grade) : check())}
              className="mt-4 w-full rounded-xl border border-line bg-ink/70 px-3 py-2.5 text-center text-lg outline-none focus:border-acid"
              lang="de"
              spellCheck={false}
              autoCapitalize="off"
            />
            {verdict && (
              <>
                <p className={`mt-3 text-sm ${verdict.ok ? 'text-acid' : 'text-amber-300'}`}>{verdict.text}</p>
                <Answer item={item} />
              </>
            )}
            {!verdict && (
              <Button variant="primary" className="mt-4 w-full" onClick={check} disabled={!typed.trim()}>
                Comprobar
              </Button>
            )}
          </>
        )}
      </Panel>

      {(mode === 'flip' ? revealed : !!verdict) && (
        <div className="animate-rise mt-3 grid grid-cols-4 gap-2">
          {(
            [
              [0, 'Otra vez', 'border-red-400/40 text-red-300'],
              [1, 'Difícil', 'border-amber-400/40 text-amber-300'],
              [2, 'Bien', 'border-acid/40 text-acid'],
              [3, 'Fácil', 'border-violet/40 text-violet'],
            ] as [SrsGrade, string, string][]
          ).map(([g, l, cls]) => (
            <button
              key={g}
              onClick={() => grade(g)}
              className={`rounded-xl border bg-panel py-3 text-sm font-semibold transition hover:bg-panel2 ${cls} ${verdict?.grade === g ? 'ring-2 ring-white/40' : ''}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-center text-xs text-muted">
        {done + 1} / {total}
      </p>
    </div>
  );
}

function Answer({ item }: { item: VocabItem }) {
  return (
    <div className="animate-rise mt-5 border-t border-line pt-4">
      <p className="text-xl font-semibold text-acid">{item.es}</p>
      {item.plural && <p className="mt-1 text-xs text-muted">Plural: die {item.plural}</p>}
      {item.example && (
        <div className="mt-3 rounded-xl bg-ink/50 p-3 text-sm">
          <p className="flex items-center justify-center gap-2" lang="de">
            {item.example.de} <SpeakButton text={item.example.de} />
          </p>
          <p className="text-muted">{item.example.es}</p>
        </div>
      )}
    </div>
  );
}
