import Phaser from 'phaser';
import { VOCAB, vocabLabel } from '../../data/vocabulary';
import { CEFR_XP_MULT, levelFromXp } from '../../engine/progression';
import { newCard } from '../../engine/srs';
import type { CEFR, SrsCard } from '../../engine/types';
import { QUEST_BY_ID, QUESTS, type QuestDef, type QuestId } from '../data/quests';

export { QUEST_PAY, QUEST_SERVE_TARGET } from '../data/quests';

// Estado persistente del juego Phaser. Reutiliza el motor educativo (SRS, progresión) de src/engine.

export interface Settings {
  translations: boolean;
  level: CEFR;
  tts: boolean;
}

export interface QuestState {
  /** misión activa; 'none' cuando ya no quedan misiones */
  id: QuestId | 'none';
  step: string;
  served: number;
  /** puesto asignado en el Bürgeramt (Misión 02) */
  desk?: number;
  /** documentos ya entregados en el puesto (Misión 02) */
  docs?: number;
  /** contador genérico del paso actual (personas conocidas, objetos colocados…) */
  count?: number;
}

export interface SaveData {
  version: 2;
  name: string;
  xp: number;
  money: number;
  inventory: string[];
  vocab: Record<string, SrsCard>;
  quest: QuestState;
  /** misiones terminadas, en orden */
  completed: string[];
  stats: { served: number; wrong: number; talks: number };
  settings: Settings;
  flags: Record<string, boolean>;
  location: { scene: string; x: number; y: number } | null;
}

export interface QuestCompletion {
  def: QuestDef;
  xp: number;
  money: number;
  next: QuestDef | null;
}

const KEY = 'berlinquest.phaser.v2';

function fresh(): SaveData {
  return {
    version: 2,
    name: 'Alex',
    xp: 0,
    money: 48,
    inventory: ['handy', 'schluessel', 'reisepass', 'kellnerblock'],
    vocab: {},
    quest: { id: 'shift', step: 'go_bar', served: 0 },
    completed: [],
    stats: { served: 0, wrong: 0, talks: 0 },
    settings: { translations: true, level: 'A1', tts: true },
    flags: {},
    location: null,
  };
}

/** Partidas guardadas antes de la cadena de misiones: { step, served } sin id. */
function migrateQuest(d: SaveData): void {
  const q = d.quest as Partial<QuestState> & { step: string };
  if (!d.completed) d.completed = [];
  if (q.id) return;
  if (q.step === 'done') {
    d.completed = ['shift'];
    d.quest = { id: 'anmeldung', step: QUEST_BY_ID.anmeldung.steps[0].id, served: q.served ?? 3 };
  } else {
    d.quest = { id: 'shift', step: q.step, served: q.served ?? 0 };
  }
}

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
          this.data = { ...base, ...d, settings: { ...base.settings, ...d.settings }, stats: { ...base.stats, ...d.stats } };
          migrateQuest(this.data);
          // al añadir misiones nuevas, una partida «terminada» continúa por la primera pendiente
          if (this.data.quest.id === 'none') {
            const next = QUESTS.find((q) => !this.data.completed.includes(q.id));
            if (next) this.data.quest = { id: next.id, step: next.steps[0].id, served: 0 };
          }
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

  /** El personaje empieza en el nivel 0 (con 100 XP pasa al 1, igual que antes del 1 al 2). */
  get level() {
    const l = levelFromXp(this.data.xp);
    return { ...l, level: l.level - 1 };
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

  // ───────────── Inventario ─────────────

  hasItem(id: string) {
    return this.data.inventory.includes(id);
  }

  addItem(id: string) {
    if (this.hasItem(id)) return;
    this.data.inventory.push(id);
    this.changed();
  }

  removeItem(id: string) {
    this.data.inventory = this.data.inventory.filter((i) => i !== id);
    this.changed();
  }

  // ───────────── Vocabulario ─────────────

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

  // ───────────── Misiones ─────────────

  get questDef(): QuestDef | null {
    return this.data.quest.id === 'none' ? null : QUEST_BY_ID[this.data.quest.id];
  }

  /** ¿Está activa la misión (y, si se indica, en alguno de esos pasos)? */
  isActive(id: QuestId, ...steps: string[]) {
    const q = this.data.quest;
    return q.id === id && (steps.length === 0 || steps.includes(q.step));
  }

  isDone(id: QuestId) {
    return this.data.completed.includes(id);
  }

  /** Memoria del mundo: hechos que los NPC recuerdan. */
  flag(k: string): boolean {
    return !!this.data.flags[k];
  }

  setQuest(step: string) {
    this.data.quest.step = step;
    this.data.quest.count = 0;
    this.emit('quest', step);
    this.changed();
  }

  /** Suma 1 al contador del paso actual y devuelve el nuevo valor. */
  bump(): number {
    this.data.quest.count = (this.data.quest.count ?? 0) + 1;
    this.emit('quest', this.data.quest.step);
    this.changed();
    return this.data.quest.count;
  }

  /** Cierra la misión activa: recompensa, la marca como completada y arranca la siguiente. */
  completeQuest(): QuestCompletion | null {
    const def = this.questDef;
    if (!def) return null;
    this.data.completed.push(def.id);
    const xp = this.addXp(def.reward.xp);
    if (def.reward.money) this.addMoney(def.reward.money);
    for (const it of def.reward.items ?? []) this.addItem(it);
    const idx = QUESTS.findIndex((q) => q.id === def.id);
    const next = QUESTS[idx + 1] ?? null;
    this.data.quest = next ? { id: next.id, step: next.steps[0].id, served: 0 } : { id: 'none', step: 'done', served: 0 };
    const result = { def, xp, money: def.reward.money, next };
    this.emit('questComplete', result);
    this.emit('quest', this.data.quest.step);
    this.changed();
    return result;
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
    const def = this.questDef;
    const step = def?.steps.find((s) => s.id === q.step);
    if (!def || !step) return { icon: '🏆', text: '¡Has completado todo el contenido disponible! Pronto habrá nuevas misiones.' };
    return {
      icon: step.icon,
      text: step.objective.replace('{served}', String(q.served)).replace('{desk}', String(q.desk ?? '?')).replace('{count}', String(q.count ?? 0)),
    };
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
