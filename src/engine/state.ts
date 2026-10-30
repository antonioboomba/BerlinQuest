import { ACHIEVEMENTS } from '../data/achievements';
import { BACKGROUNDS } from '../data/backgrounds';
import type { MissionSession } from './dialogue';
import { newCard, reviewCard } from './srs';
import type { GameState, Outcome, Player, Settings, Skill, SrsGrade } from './types';

export const DEFAULT_SETTINGS: Settings = { level: 'A1', translations: 'always', tts: true, ttsRate: 0.9 };

export function initialState(): GameState {
  const skill = () => ({ xp: 0, correct: 0, attempts: 0 });
  return {
    version: 1,
    createdAt: Date.now(),
    player: null,
    xp: 0,
    money: 0,
    inventory: [],
    flags: {},
    skills: { comprehension: skill(), vocabulary: skill(), grammar: skill(), production: skill() },
    vocab: {},
    missions: {},
    achievements: {},
    settings: DEFAULT_SETTINGS,
    stats: { reviews: 0, answers: 0, correctAnswers: 0 },
    journal: [],
  };
}

export type Action =
  | { type: 'NEW_GAME'; player: Player; settings: Settings }
  | { type: 'RECORD_ANSWER'; skill: Skill; correct: boolean; xp: number }
  | { type: 'LEARN_VOCAB'; ids: string[] }
  | { type: 'REVIEW_CARD'; id: string; grade: SrsGrade }
  | {
      type: 'FINISH_MISSION';
      missionId: string;
      session: MissionSession;
      outcome: Outcome;
      stars: number;
      xp: number;
      transientItems: string[];
    }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'LOAD'; state: GameState }
  | { type: 'RESET' };

function baseReducer(s: GameState, a: Action): GameState {
  const now = Date.now();
  switch (a.type) {
    case 'NEW_GAME': {
      const kit = BACKGROUNDS[a.player.background];
      return {
        ...initialState(),
        player: a.player,
        settings: a.settings,
        money: kit.money,
        inventory: ['reisepass', 'handy', 'schluessel', ...kit.items],
        journal: [{ t: now, text: `${a.player.firstName} llega a Berlín con ${kit.money} € y muchas ganas.` }],
      };
    }
    case 'RECORD_ANSWER': {
      const st = s.skills[a.skill];
      return {
        ...s,
        xp: s.xp + a.xp,
        skills: {
          ...s.skills,
          [a.skill]: { xp: st.xp + a.xp, correct: st.correct + (a.correct ? 1 : 0), attempts: st.attempts + 1 },
        },
        stats: {
          ...s.stats,
          answers: s.stats.answers + 1,
          correctAnswers: s.stats.correctAnswers + (a.correct ? 1 : 0),
        },
      };
    }
    case 'LEARN_VOCAB': {
      const fresh = a.ids.filter((id) => !s.vocab[id]);
      if (!fresh.length) return s;
      const vocab = { ...s.vocab };
      for (const id of fresh) vocab[id] = newCard(id, now);
      return { ...s, vocab };
    }
    case 'REVIEW_CARD': {
      const card = s.vocab[a.id];
      if (!card) return s;
      const gain = a.grade === 0 ? 1 : 3;
      return {
        ...s,
        xp: s.xp + gain,
        vocab: { ...s.vocab, [a.id]: reviewCard(card, a.grade, now) },
        skills: {
          ...s.skills,
          vocabulary: {
            xp: s.skills.vocabulary.xp + gain,
            correct: s.skills.vocabulary.correct + (a.grade > 0 ? 1 : 0),
            attempts: s.skills.vocabulary.attempts + 1,
          },
        },
        stats: { ...s.stats, reviews: s.stats.reviews + 1 },
      };
    }
    case 'FINISH_MISSION': {
      const prev = s.missions[a.missionId] ?? { completed: false, bestStars: 0, attempts: 0 };
      const completed = a.outcome !== 'fail';
      const firstClear = completed && !prev.completed;
      return {
        ...s,
        // La XP de finalización solo se da completa la primera vez; las repeticiones dan un 25 %.
        xp: s.xp + (firstClear ? a.xp : Math.round(a.xp * 0.25)),
        money: a.session.money,
        inventory: a.session.inventory.filter((i) => !a.transientItems.includes(i)),
        flags: { ...s.flags, ...a.session.flags },
        missions: {
          ...s.missions,
          [a.missionId]: {
            completed: prev.completed || completed,
            bestStars: Math.max(prev.bestStars, a.stars),
            attempts: prev.attempts + 1,
            lastOutcome: a.outcome,
            completedAt: firstClear ? now : prev.completedAt,
          },
        },
        journal: [...s.journal, ...a.session.journal.map((text) => ({ t: now, text }))].slice(-60),
      };
    }
    case 'UPDATE_SETTINGS':
      return { ...s, settings: { ...s.settings, ...a.settings } };
    case 'LOAD':
      return a.state;
    case 'RESET':
      return initialState();
  }
}

/** Reducer con comprobación automática de logros tras cada acción. */
export function gameReducer(s: GameState, a: Action): GameState {
  const next = baseReducer(s, a);
  if (!next.player) return next;
  let achievements = next.achievements;
  for (const ach of ACHIEVEMENTS) {
    if (!achievements[ach.id] && ach.check(next)) {
      achievements = { ...achievements, [ach.id]: Date.now() };
    }
  }
  return achievements === next.achievements ? next : { ...next, achievements };
}
