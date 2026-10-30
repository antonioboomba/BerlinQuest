import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useSpeech } from '../hooks/useSpeech';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'violet';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-acid text-ink hover:bg-[#5dffa0] font-semibold shadow-[0_0_20px_-6px_#39ff88]',
  violet: 'bg-violet text-white hover:bg-[#b874f9] font-semibold shadow-[0_0_20px_-6px_#a855f7]',
  secondary: 'bg-panel2 text-white border border-line hover:border-acid/60 hover:bg-[#20203a]',
  ghost: 'text-muted hover:text-white hover:bg-white/5',
  danger: 'bg-red-500/10 text-red-300 border border-red-500/40 hover:bg-red-500/20',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acid ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-panel/90 backdrop-blur ${className}`}>{children}</div>;
}

export function ProgressBar({ value, color = 'acid', className = '' }: { value: number; color?: 'acid' | 'violet' | 'amber'; className?: string }) {
  const bg = color === 'acid' ? 'bg-acid' : color === 'violet' ? 'bg-violet' : 'bg-amber-400';
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-white/8 ${className}`}>
      <div className={`h-full rounded-full ${bg} transition-[width] duration-700`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border border-line bg-white/5 px-2 py-0.5 text-xs ${className}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 scrollbar-thin sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-white/5 hover:text-white" aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SpeakButton({ text, className = '' }: { text: string; className?: string }) {
  const { speak, enabled } = useSpeech();
  if (!enabled) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm hover:bg-acid/20 ${className}`}
      aria-label="Escuchar en alemán"
      title="Escuchar en alemán"
    >
      🔊
    </button>
  );
}

export function Stars({ n, max = 3, className = '' }: { n: number; max?: number; className?: string }) {
  return (
    <span className={className} aria-label={`${n} de ${max} estrellas`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? 'text-amber-300' : 'text-white/15'}>★</span>
      ))}
    </span>
  );
}
