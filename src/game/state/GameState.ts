import Phaser from 'phaser';
import { VOCAB, vocabLabel } from '../../data/vocabulary';
import { CEFR_XP_MULT, levelFromXp } from '../../engine/progression';
import { newCard } from '../../engine/srs';
import type { CEFR, SrsCard } from '../../engine/types';

// Estado persistente del juego Phaser. Reutiliza el motor educativo (SRS, progresión) de src/engine.

export type QuestStep = 'go_bar' | 'talk_boss' | 'serve' | 'get_paid' | 'done';

export interface Settings {
  translations: boolean;
  level: CEFR;
  tts: boolean;
}

export interface SaveData {
  version: 2;
  name: string;
  xp: number;
  money: number;
  inventory: string[];
  vocab: Record<string, SrsCard>;
  quest: { step: QuestStep; served: number };
  stats: { served: number; wrong: number; talks: number };
  settings: Settings;
  flags: Record<string, boolean>;
  location: { scene: string; x: number; y: number } | null;
}

const KEY = 'berlinquest.phaser.v2';

function fresh(): SaveData {
  return {
    version: 2,
    name: 'Alex',
    xp: 20,
    money: 48,
    inventory: ['handy', 'schluessel', 'reisepass', 'kellnerblock'],
    vocab: {},
    quest: { step: 'go_bar', served: 0 },
    stats: { served: 0, wrong: 0, talks: 0 },
    settings: { translations: true, level: 'A1', tts: true },
    flags: {},
    location: null,
  };
}

export const QUEST_SERVE_TARGET = 3;
export const QUEST_PAY = 30;

export const QUEST_STEPS: { step: QuestStep; label: string }[] = [
  { step: 'go_bar', label: 'Ve al bar «Kater Karlo»' },
  { step: 'talk_boss', label: 'Habla con el jefe' },
  { step: 'serve', label: `Sirve ${QUEST_SERVE_TARGET} bebidas a los clientes` },
  { step: 'get_paid', label: `Cobra tu sueldo (${QUEST_PAY} €)` },
];

class GameStateImpl extends Phaser.Events.EventEmitter {
  data: SaveData = fresh();
  private saveTimer: number | undefined;

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as SaveData;
        if (d.version === 2) {
          const base = fresh();
          this.data = { ...base, ...d, settings: { ...base.settings, ...d.settings }, quest: { ...base.quest, ...d.quest }, stats: { ...base.stats, ...d.stats } };
        }
      }
    } catch {
      /* partida corrupta o almacenamiento no disponible: empezamos de cero */
    }
  }

  save() {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch {
        /* sin almacenamiento */
      }
    }, 250);
  }

  reset() {
    this.data = fresh();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* sin almacenamiento */
    }
    this.changed();
  }

  private changed() {
    this.emit('change');
    this.save();
  }

  get level() {
    return levelFromXp(this.data.xp);
  }

  addXp(base: number): number {
    const before = this.level.level;
    const gain = Math.round(base * CEFR_XP_MULT[this.data.settings.level]);
    this.data.xp += gain;
    if (this.level.level > before) this.emit('levelup', this.level.level);
    this.changed();
    return gain;
  }

  addMoney(n: number) {
    this.data.money = Math.round((this.data.money + n) * 100) / 100;
    this.changed();
  }

  /** Registra vocabulario. Devuelve las palabras que eran nuevas. */
  learn(ids: string[]): string[] {
    const freshIds = ids.filter((id) => VOCAB[id] && !this.data.vocab[id]);
    for (const id of freshIds) this.data.vocab[id] = newCard(id);
    if (freshIds.length) this.changed();
    return freshIds;
  }

  vocabText(id: string): string {
    const v = VOCAB[id];
    return v ? `${vocabLabel(v)} (${v.es})` : id;
  }

  setQuest(step: QuestStep) {
    this.data.quest.step = step;
    this.emit('quest', step);
    this.changed();
  }

  setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
    this.data.settings[k] = v;
    this.changed();
  }

  setFlag(k: string) {
    this.data.flags[k] = true;
    this.changed();
  }

  setLocation(scene: string, x: number, y: number) {
    this.data.location = { scene, x, y };
    this.save();
  }

  bumpStat(k: keyof SaveData['stats']) {
    this.data.stats[k]++;
    this.changed();
  }

  objective(): { icon: string; text: string } {
    const q = this.data.quest;
    switch (q.step) {
      case 'go_bar':
        return { icon: '🍺', text: 'Ve al bar.' };
      case 'talk_boss':
        return { icon: '💬', text: 'Habla con el jefe (Mehmet).' };
      case 'serve':
        return { icon: '🍺', text: `Sirve la bebida correcta al cliente. (${q.served}/${QUEST_SERVE_TARGET})` };
      case 'get_paid':
        return { icon: '💶', text: 'Habla con Mehmet para cobrar.' };
      case 'done':
        return { icon: '🗺️', text: 'Explora Kreuzberg y habla con la gente.' };
    }
  }
}

export const GameState = new GameStateImpl();

/** Voz alemana del navegador (opcional). */
export function speakDe(text: string) {
  if (!GameState.data.settings.tts || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 0.95;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith('de'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* sin voz */
  }
}
