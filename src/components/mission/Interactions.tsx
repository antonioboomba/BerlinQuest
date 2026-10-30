import { useState } from 'react';
import { GERMAN_ALPHABET, letterName } from '../../engine/evaluate';
import type { ChoiceOption, CEFR } from '../../engine/types';
import { Button } from '../ui';

const inputCls =
  'w-full rounded-xl border border-line bg-ink/70 px-3 py-2.5 text-white outline-none placeholder:text-white/25 focus:border-acid';

export function ChoicePanel({
  options,
  disabled,
  showEs,
  onPick,
}: {
  options: ChoiceOption[];
  disabled: Set<number>;
  showEs: boolean;
  onPick: (i: number) => void;
}) {
  // Solo se muestran traducciones si todas las opciones tienen una (si no, delataría la correcta).
  const allTranslated = options.every((o) => o.es && o.es !== '—');
  return (
    <div className="grid gap-2">
      {options.map((o, i) => (
        <button
          key={i}
          disabled={disabled.has(i)}
          onClick={() => onPick(i)}
          className="group rounded-xl border border-line bg-panel2 px-4 py-3 text-left transition hover:border-acid/60 hover:bg-[#20203a] disabled:cursor-not-allowed disabled:border-red-400/30 disabled:opacity-40"
        >
          <span className="mr-2 font-mono text-xs text-acid">{i + 1}</span>
          <span lang="de">{o.de}</span>
          {showEs && allTranslated && <span className="mt-0.5 block pl-5 text-xs text-muted">{o.es}</span>}
        </button>
      ))}
    </div>
  );
}

export function ClozePanel({
  before,
  after,
  bank,
  level,
  hint,
  onSubmit,
}: {
  before: string;
  after: string;
  bank?: string[];
  level: CEFR;
  hint: string;
  onSubmit: (answer: string) => void;
}) {
  const [value, setValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const showBank = !!bank && (level === 'A1' || level === 'A2' || showHint);
  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value);
    setValue('');
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink/50 p-3 text-lg" lang="de">
        <span>{before}</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="w-36 border-b-2 border-acid bg-transparent px-1 text-center text-acid outline-none"
          aria-label="Hueco"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <span>{after}</span>
      </div>
      {showBank && (
        <div className="flex flex-wrap gap-2">
          {bank!.map((w) => (
            <button key={w} onClick={() => setValue(w)} className="rounded-lg border border-line bg-panel2 px-3 py-1.5 font-mono text-sm hover:border-acid/60" lang="de">
              {w}
            </button>
          ))}
        </div>
      )}
      {showHint && <p className="text-sm text-amber-200">💡 {hint}</p>}
      <div className="flex gap-2">
        {!showHint && (
          <Button variant="ghost" onClick={() => setShowHint(true)}>
            💡 Pista
          </Button>
        )}
        <UmlautKeys onKey={(k) => setValue((v) => v + k)} />
        <Button variant="primary" className="ml-auto" onClick={submit} disabled={!value.trim()}>
          Comprobar
        </Button>
      </div>
    </div>
  );
}

export function FreePanel({ placeholder, busy, onSubmit }: { placeholder?: string; busy: boolean; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (!value.trim() || busy) return;
    onSubmit(value.trim());
    setValue('');
  };
  return (
    <div className="flex flex-col gap-2">
      <textarea
        autoFocus
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className={`${inputCls} resize-none`}
        lang="de"
        spellCheck={false}
      />
      <div className="flex items-center gap-2">
        <UmlautKeys onKey={(k) => setValue((v) => v + k)} />
        <span className="hidden text-xs text-muted sm:inline">Enter para enviar</span>
        <Button variant="primary" className="ml-auto" onClick={submit} disabled={!value.trim() || busy}>
          {busy ? '…' : 'Enviar'}
        </Button>
      </div>
    </div>
  );
}

export function SpellPanel({ word, onSubmit }: { word: string; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  const [table, setTable] = useState(false);
  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value);
    setValue('');
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-2xl tracking-[0.3em] text-acid">{word.toUpperCase()}</p>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="er u i zett"
        className={inputCls}
        spellCheck={false}
        autoCapitalize="off"
      />
      {table && (
        <div className="grid grid-cols-5 gap-1 rounded-xl border border-line bg-ink/50 p-2 font-mono text-xs sm:grid-cols-10">
          {Object.keys(GERMAN_ALPHABET).map((l) => (
            <span key={l} className="rounded bg-white/5 px-1 py-0.5 text-center">
              <span className="text-acid">{l.toUpperCase()}</span> {letterName(l)}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setTable((t) => !t)}>
          🔤 {table ? 'Ocultar' : 'Ver'} alfabeto
        </Button>
        <Button variant="primary" className="ml-auto" onClick={submit} disabled={!value.trim()}>
          Deletrear
        </Button>
      </div>
    </div>
  );
}

function UmlautKeys({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="flex gap-1">
      {['ä', 'ö', 'ü', 'ß'].map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          className="h-9 w-9 rounded-lg border border-line bg-panel2 font-mono text-sm hover:border-acid/60"
          aria-label={`Insertar ${k}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
