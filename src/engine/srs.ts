import type { SrsCard, SrsGrade } from './types';

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

export function newCard(id: string, now = Date.now()): SrsCard {
  return { id, ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0, firstSeen: now };
}

/**
 * Variante simplificada de SM-2.
 * - "Otra vez" reinicia la tarjeta y la vuelve a mostrar en 1 minuto.
 * - Las primeras repeticiones correctas usan pasos fijos (1 día, 3 días) y luego intervalo × facilidad.
 */
export function reviewCard(card: SrsCard, grade: SrsGrade, now = Date.now()): SrsCard {
  let { ease, interval, reps, lapses } = card;

  if (grade === 0) {
    lapses += 1;
    reps = 0;
    ease = Math.max(1.3, ease - 0.2);
    return { ...card, ease, interval: 0, reps, lapses, due: now + MIN, lastReviewed: now };
  }

  reps += 1;
  const easeDelta = grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0;
  ease = Math.max(1.3, Math.min(3, ease + easeDelta));

  if (reps === 1) interval = grade === 1 ? 0.5 : grade === 3 ? 2 : 1;
  else if (reps === 2) interval = grade === 1 ? 1.5 : grade === 3 ? 5 : 3;
  else interval = Math.max(1, interval * (grade === 1 ? 1.2 : ease) * (grade === 3 ? 1.3 : 1));

  return { ...card, ease, interval, reps, lapses, due: now + interval * DAY, lastReviewed: now };
}

export function isDue(card: SrsCard, now = Date.now()): boolean {
  return card.due <= now;
}

export type Mastery = 'new' | 'learning' | 'known' | 'mastered';

export function mastery(card: SrsCard): Mastery {
  if (card.reps === 0) return 'new';
  if (card.interval < 3) return 'learning';
  if (card.interval < 14) return 'known';
  return 'mastered';
}

export function describeDue(card: SrsCard, now = Date.now()): string {
  const diff = card.due - now;
  if (diff <= 0) return 'ahora';
  if (diff < 60 * MIN) return `en ${Math.ceil(diff / MIN)} min`;
  if (diff < DAY) return `en ${Math.ceil(diff / (60 * MIN))} h`;
  return `en ${Math.round(diff / DAY)} d`;
}
