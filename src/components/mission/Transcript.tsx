import { useState, type ReactNode } from 'react';
import { VOCAB, vocabLabel } from '../../data/vocabulary';
import type { NpcProfile, Settings } from '../../engine/types';
import { SpeakButton } from '../ui';

export type Entry =
  | { kind: 'npc'; speaker: string; de: string; es: string; note?: string }
  | { kind: 'narration'; es: string }
  | { kind: 'player'; de: string; wrong?: boolean }
  | { kind: 'feedback'; tone: 'good' | 'warn' | 'bad' | 'info'; title: string; text?: string; items?: { label: string; fix?: string }[]; model?: string; collapsed?: boolean }
  | { kind: 'vocab'; ids: string[] };

const TONES = {
  good: 'border-acid/40 bg-acid/5',
  warn: 'border-amber-400/40 bg-amber-400/5',
  bad: 'border-red-400/40 bg-red-400/5',
  info: 'border-violet/40 bg-violet/5',
};
const TONE_ICON = { good: '✅', warn: '💡', bad: '✗', info: 'ℹ️' };

export function TranscriptEntry({
  e,
  npcs,
  translations,
  playerAvatar,
}: {
  e: Entry;
  npcs: Record<string, NpcProfile>;
  translations: Settings['translations'];
  playerAvatar: ReactNode;
}) {
  switch (e.kind) {
    case 'narration':
      return <p className="animate-rise mx-auto max-w-xl px-2 text-center text-sm italic leading-relaxed text-white/70">{e.es}</p>;
    case 'npc':
      return <NpcBubble e={e} npc={npcs[e.speaker]} translations={translations} />;
    case 'player':
      return (
        <div className="animate-rise flex items-end justify-end gap-2">
          <div className={`max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 ${e.wrong ? 'bg-red-400/10 text-white/60 line-through decoration-red-400/60' : 'bg-violet/25 text-white'}`}>
            <span className="flex items-start gap-2">
              <span>{e.de}</span>
              {!e.wrong && <SpeakButton text={e.de} className="-mr-2 h-6 w-6 text-xs" />}
            </span>
          </div>
          <div className="shrink-0">{playerAvatar}</div>
        </div>
      );
    case 'feedback':
      return <FeedbackCard e={e} />;
    case 'vocab':
      return <VocabChip ids={e.ids} />;
  }
}

function NpcBubble({ e, npc, translations }: { e: Extract<Entry, { kind: 'npc' }>; npc?: NpcProfile; translations: Settings['translations'] }) {
  const [showEs, setShowEs] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const color = npc?.color ?? '#8d8daa';
  return (
    <div className="animate-rise flex items-start gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg" style={{ borderColor: color, background: `${color}1a` }}>
        {npc?.emoji ?? '💬'}
      </div>
      <div className="min-w-0 max-w-[85%]">
        <p className="mb-1 text-xs">
          <span className="font-semibold" style={{ color }}>{npc?.name ?? e.speaker}</span>
          {npc?.role && <span className="text-muted"> · {npc.role}</span>}
        </p>
        <div className="rounded-2xl rounded-tl-sm border border-line bg-panel2 px-4 py-2.5">
          <div className="flex items-start gap-2">
            <p className="flex-1 leading-relaxed" lang="de">{e.de}</p>
            <SpeakButton text={e.de} />
          </div>
          {translations === 'always' && <p className="mt-1.5 border-t border-white/5 pt-1.5 text-sm text-muted">{e.es}</p>}
          {translations === 'tap' &&
            (showEs ? (
              <p className="mt-1.5 border-t border-white/5 pt-1.5 text-sm text-muted">{e.es}</p>
            ) : (
              <button onClick={() => setShowEs(true)} className="mt-1 text-xs text-violet hover:underline">
                Ver traducción
              </button>
            ))}
        </div>
        {e.note && (
          <button onClick={() => setShowNote((v) => !v)} className="mt-1 text-left text-xs text-amber-200/80 hover:text-amber-200">
            {showNote ? `📝 ${e.note}` : '📝 Nota lingüística'}
          </button>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({ e }: { e: Extract<Entry, { kind: 'feedback' }> }) {
  const [open, setOpen] = useState(!e.collapsed);
  const hasBody = !!(e.text || e.items?.length || e.model);
  return (
    <div className={`animate-rise mx-auto w-full max-w-xl rounded-xl border px-4 py-2.5 text-sm ${TONES[e.tone]}`}>
      <button className="flex w-full items-center gap-2 text-left" onClick={() => hasBody && setOpen((o) => !o)} aria-expanded={open}>
        <span>{TONE_ICON[e.tone]}</span>
        <span className="flex-1 font-semibold">{e.title}</span>
        {hasBody && e.collapsed !== undefined && <span className="text-xs text-muted">{open ? 'ocultar' : 'ver'}</span>}
      </button>
      {open && hasBody && (
        <div className="mt-1.5 space-y-1.5 pl-6 text-white/80">
          {e.text && <p>{e.text}</p>}
          {e.items?.map((it, i) => (
            <p key={i}>
              • {it.label}
              {it.fix && <span className="ml-1 font-mono text-acid">→ {it.fix}</span>}
            </p>
          ))}
          {e.model && (
            <p className="text-muted">
              Una forma natural de decirlo: <span className="text-white" lang="de">«{e.model}»</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function VocabChip({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState(false);
  const items = ids.map((id) => VOCAB[id]).filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="animate-rise mx-auto">
      <button onClick={() => setOpen((o) => !o)} className="rounded-full border border-acid/30 bg-acid/5 px-3 py-1 text-xs text-acid hover:bg-acid/10">
        📚 +{items.length} palabra{items.length > 1 ? 's' : ''} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-2 grid gap-1 rounded-xl border border-line bg-panel p-3 text-sm sm:grid-cols-2">
          {items.map((v) => (
            <p key={v.id}>
              <span className="font-semibold" lang="de">{vocabLabel(v)}</span> <span className="text-muted">— {v.es}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
