import type { CEFR, Condition, DialogueContext, Dyn, Effects, FlagValue, LevelText } from './types';
import { CEFR_LEVELS } from './types';

export function resolveDyn<T>(value: Dyn<T>, ctx: DialogueContext): T {
  return typeof value === 'function' ? (value as (c: DialogueContext) => T)(ctx) : value;
}

/** Elige la variante más alta que no supere el nivel del jugador (o la más baja disponible). */
export function resolveLevelText(text: LevelText, level: CEFR): string {
  if (typeof text === 'string') return text;
  const idx = CEFR_LEVELS.indexOf(level);
  for (let i = idx; i >= 0; i--) {
    const t = text[CEFR_LEVELS[i]];
    if (t) return t;
  }
  for (const l of CEFR_LEVELS) {
    const t = text[l];
    if (t) return t;
  }
  return '';
}

export function resolveText(value: Dyn<LevelText>, ctx: DialogueContext): string {
  return resolveLevelText(resolveDyn(value, ctx), ctx.level);
}

export function checkCondition(c: Condition, ctx: DialogueContext): boolean {
  if ('hasItem' in c) return ctx.inventory.includes(c.hasItem);
  if ('notItem' in c) return !ctx.inventory.includes(c.notItem);
  if ('notFlag' in c) return !ctx.flags[c.notFlag];
  const v = ctx.flags[c.flag];
  return c.equals === undefined ? !!v : v === c.equals;
}

/** Estado local de una partida de misión: se confirma en el estado global al terminar. */
export interface MissionSession {
  money: number;
  inventory: string[];
  flags: Record<string, FlagValue>;
  objectives: string[];
  journal: string[];
  vocab: string[];
}

export function applySessionEffects(s: MissionSession, e?: Effects): MissionSession {
  if (!e) return s;
  let inventory = s.inventory;
  if (e.removeItems) inventory = inventory.filter((i) => !e.removeItems!.includes(i));
  if (e.addItems) inventory = [...inventory, ...e.addItems.filter((i) => !inventory.includes(i))];
  return {
    money: Math.round((s.money + (e.money ?? 0)) * 100) / 100,
    inventory,
    flags: e.setFlags ? { ...s.flags, ...e.setFlags } : s.flags,
    objectives:
      e.completeObjective && !s.objectives.includes(e.completeObjective)
        ? [...s.objectives, e.completeObjective]
        : s.objectives,
    journal: e.journal ? [...s.journal, e.journal] : s.journal,
    vocab: e.learnVocab ? [...new Set([...s.vocab, ...e.learnVocab])] : s.vocab,
  };
}

export function formatEuro(n: number): string {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
