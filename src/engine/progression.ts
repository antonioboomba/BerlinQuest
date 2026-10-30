import type { CEFR, GameState, Location, Skill } from './types';

/** XP necesaria para pasar del nivel `level` al siguiente. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 60;
}

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}

/** Las respuestas en niveles más altos valen más XP. */
export const CEFR_XP_MULT: Record<CEFR, number> = { A1: 1, A2: 1.2, B1: 1.5, B2: 2 };

export function answerXp(level: CEFR, firstTry: boolean, base = 10): number {
  return Math.round((firstTry ? base : base / 2) * CEFR_XP_MULT[level]);
}

/** Rango de habilidad 0-5 a partir de su XP. */
export function skillRank(xp: number): number {
  return Math.min(5, Math.floor(Math.sqrt(xp / 20)));
}

export function accuracy(correct: number, attempts: number): number {
  return attempts === 0 ? 0 : correct / attempts;
}

export const SKILL_LABELS: Record<Skill, { es: string; de: string; emoji: string }> = {
  comprehension: { es: 'Comprensión', de: 'Verstehen', emoji: '👂' },
  vocabulary: { es: 'Vocabulario', de: 'Wortschatz', emoji: '📚' },
  grammar: { es: 'Gramática', de: 'Grammatik', emoji: '🧩' },
  production: { es: 'Producción', de: 'Sprechen & Schreiben', emoji: '💬' },
};

export function isLocationUnlocked(loc: Location, s: GameState): boolean {
  const u = loc.unlock;
  switch (u.type) {
    case 'always':
      return true;
    case 'mission':
      return !!s.missions[u.missionId]?.completed;
    case 'level':
      return levelFromXp(s.xp).level >= u.level;
  }
}

export function unlockLabel(loc: Location, missionTitle: (id: string) => string): string {
  const u = loc.unlock;
  switch (u.type) {
    case 'always':
      return 'Disponible';
    case 'mission':
      return `Completa «${missionTitle(u.missionId)}»`;
    case 'level':
      return `Alcanza el nivel ${u.level}`;
  }
}
