import { initialState } from './state';
import type { GameState } from './types';

const KEY = 'berlinquest.save.v1';

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(s: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Rellena campos que falten en partidas guardadas con versiones anteriores. */
export function migrate(data: unknown): GameState | null {
  if (!data || typeof data !== 'object' || (data as GameState).version !== 1) return null;
  const base = initialState();
  const d = data as Partial<GameState>;
  return {
    ...base,
    ...d,
    skills: { ...base.skills, ...d.skills },
    settings: { ...base.settings, ...d.settings },
    stats: { ...base.stats, ...d.stats },
  } as GameState;
}

export function exportSave(s: GameState): void {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `berlin-quest-${s.player?.firstName ?? 'partida'}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importSave(file: File): Promise<GameState | null> {
  try {
    return migrate(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}
