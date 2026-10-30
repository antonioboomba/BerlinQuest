import { useEffect } from 'react';

export interface Toast {
  id: string;
  emoji: string;
  title: string;
  text: string;
  tone: 'acid' | 'violet';
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);
  return (
    <button
      onClick={() => onDismiss(toast.id)}
      className={`animate-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-panel/95 px-4 py-3 text-left backdrop-blur ${toast.tone === 'acid' ? 'glow-acid border-acid/50' : 'glow-violet border-violet/50'}`}
    >
      <span className="text-2xl">{toast.emoji}</span>
      <span>
        <span className="block text-sm font-bold">{toast.title}</span>
        <span className="block text-xs text-muted">{toast.text}</span>
      </span>
    </button>
  );
}
