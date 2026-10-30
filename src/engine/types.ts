// Tipos compartidos entre datos, motor y presentación.

export type CEFR = 'A1' | 'A2' | 'B1' | 'B2';
export const CEFR_LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2'];

export type Skill = 'comprehension' | 'vocabulary' | 'grammar' | 'production';
export const SKILLS: Skill[] = ['comprehension', 'vocabulary', 'grammar', 'production'];

/** Texto que puede variar según el nivel del jugador. Se usa la variante más alta ≤ nivel actual. */
export type LevelText = string | Partial<Record<CEFR, string>>;

export type FlagValue = boolean | number | string;

// ───────────────────────── Jugador ─────────────────────────

export type HairStyle = 'short' | 'long' | 'curly' | 'buzz' | 'bun';
export type Accessory = 'none' | 'glasses' | 'beanie' | 'earring';
export type Background = 'musician' | 'gastro' | 'student';

export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: string;
  accessory: Accessory;
}

export interface Player {
  firstName: string;
  lastName: string;
  /** id de país (ver data/countries) */
  origin: string;
  background: Background;
  appearance: Appearance;
}

// ───────────────────────── Vocabulario / SRS ─────────────────────────

export interface VocabItem {
  id: string;
  de: string;
  /** artículo para sustantivos */
  article?: 'der' | 'die' | 'das';
  plural?: string;
  es: string;
  example?: { de: string; es: string };
  cefr: CEFR;
  tags: string[];
}

export interface SrsCard {
  id: string;
  /** factor de facilidad (SM-2) */
  ease: number;
  /** intervalo actual en días */
  interval: number;
  /** timestamp ms de la próxima revisión */
  due: number;
  reps: number;
  lapses: number;
  firstSeen: number;
  lastReviewed?: number;
}

/** 0 = otra vez, 1 = difícil, 2 = bien, 3 = fácil */
export type SrsGrade = 0 | 1 | 2 | 3;

// ───────────────────────── Estado de juego ─────────────────────────

export interface SkillStat {
  xp: number;
  correct: number;
  attempts: number;
}

export interface MissionRecord {
  completed: boolean;
  bestStars: number;
  attempts: number;
  lastOutcome?: Outcome;
  completedAt?: number;
}

export interface Settings {
  level: CEFR;
  translations: 'always' | 'tap' | 'never';
  tts: boolean;
  ttsRate: number;
}

export interface JournalEntry {
  t: number;
  text: string;
}

export interface GameState {
  version: 1;
  createdAt: number;
  player: Player | null;
  xp: number;
  money: number;
  inventory: string[];
  flags: Record<string, FlagValue>;
  skills: Record<Skill, SkillStat>;
  vocab: Record<string, SrsCard>;
  missions: Record<string, MissionRecord>;
  achievements: Record<string, number>;
  settings: Settings;
  stats: { reviews: number; answers: number; correctAnswers: number };
  journal: JournalEntry[];
}

// ───────────────────────── Misiones / diálogos ─────────────────────────

export type Outcome = 'success' | 'partial' | 'fail';

export interface Effects {
  money?: number;
  addItems?: string[];
  removeItems?: string[];
  setFlags?: Record<string, FlagValue>;
  learnVocab?: string[];
  completeObjective?: string;
  journal?: string;
}

export type Condition =
  | { hasItem: string }
  | { notItem: string }
  | { notFlag: string }
  | { flag: string; equals?: FlagValue };

/** Contexto disponible para textos dinámicos y evaluadores. */
export interface DialogueContext {
  player: Player;
  level: CEFR;
  flags: Record<string, FlagValue>;
  inventory: string[];
  money: number;
}

export type Dyn<T> = T | ((ctx: DialogueContext) => T);

interface NodeBase {
  id: string;
  effects?: Effects;
  vocab?: string[];
}

export interface NpcNode extends NodeBase {
  kind: 'npc';
  speaker: string;
  de: Dyn<LevelText>;
  es: Dyn<LevelText>;
  /** nota cultural o lingüística opcional */
  note?: string;
  next: string;
}

export interface NarrationNode extends NodeBase {
  kind: 'narration';
  es: Dyn<string>;
  next: string;
}

export interface ChoiceOption {
  de: string;
  es: string;
  /** true/false = opción evaluada; undefined = decisión narrativa */
  correct?: boolean;
  feedback?: string;
  /** si falta y la opción es incorrecta, el jugador reintenta */
  next?: string;
  effects?: Effects;
  requires?: Condition;
}

export interface ChoiceNode extends NodeBase {
  kind: 'choice';
  skill: Skill;
  prompt: Dyn<string>;
  options: ChoiceOption[];
}

export interface ClozeNode extends NodeBase {
  kind: 'cloze';
  skill: Skill;
  prompt: string;
  before: string;
  after: string;
  answers: string[];
  /** banco de palabras (se muestra en A1/A2 o al pedir pista) */
  bank?: string[];
  /** feedback específico para respuestas incorrectas típicas (clave normalizada) */
  wrong?: Record<string, string>;
  hint: string;
  explanation: string;
  next: string;
}

export interface FreeRule {
  id: string;
  kind: 'require' | 'mistake' | 'tip';
  test: (text: string, ctx: DialogueContext) => boolean;
  /** require: qué falta; mistake: explicación del error; tip: sugerencia de estilo */
  message: Dyn<string>;
  /** frase corregida sugerida (mistake) */
  fix?: Dyn<string>;
}

export interface FreeNode extends NodeBase {
  kind: 'free';
  skill: Skill;
  task: Dyn<string>;
  placeholder?: string;
  modelAnswers: Dyn<string[]>;
  rules: FreeRule[];
  /** reacción del NPC si la respuesta es comprensible */
  npcReply: { speaker: string; de: Dyn<string>; es: Dyn<string> };
  next: string;
}

export interface SpellNode extends NodeBase {
  kind: 'spell';
  skill: Skill;
  task: string;
  /** qué deletrear */
  word: Dyn<string>;
  npcReply: { speaker: string; de: string; es: string };
  next: string;
}

export interface BranchNode extends NodeBase {
  kind: 'branch';
  branches: { if: Condition; next: string }[];
  else: string;
}

export interface EndNode extends NodeBase {
  kind: 'end';
  outcome: Outcome;
  title: string;
  summary: Dyn<string>;
  xp: number;
}

export type DialogueNode =
  | NpcNode
  | NarrationNode
  | ChoiceNode
  | ClozeNode
  | FreeNode
  | SpellNode
  | BranchNode
  | EndNode;

export interface Objective {
  id: string;
  text: string;
  optional?: boolean;
}

export interface NpcProfile {
  name: string;
  role: string;
  emoji: string;
  color: string;
}

export interface Mission {
  id: string;
  locationId: string;
  title: string;
  subtitle: string;
  description: string;
  cefr: CEFR;
  playable: boolean;
  objectives: Objective[];
  npcs: Record<string, NpcProfile>;
  start: string;
  nodes: Record<string, DialogueNode>;
  /** ítems que se descartan al terminar (números de espera, cafés…) */
  transientItems?: string[];
  unlocks?: string[];
  rewardsPreview: string[];
}

// ───────────────────────── Mundo ─────────────────────────

export type UnlockRule =
  | { type: 'always' }
  | { type: 'mission'; missionId: string }
  | { type: 'level'; level: number };

export interface Location {
  id: string;
  name: string;
  district: string;
  emoji: string;
  missionId: string;
  /** posición en el mapa SVG (viewBox 0 0 400 300) */
  x: number;
  y: number;
  unlock: UnlockRule;
  blurb: string;
}

export interface Item {
  id: string;
  name: string;
  de: string;
  emoji: string;
  description: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (s: GameState) => boolean;
}
