import type { Achievement } from '../engine/types';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'arrival', emoji: '🛬', title: 'Willkommen in Berlin', description: 'Crea tu personaje.', check: (s) => !!s.player },
  { id: 'first_words', emoji: '🌱', title: 'Erste Wörter', description: 'Aprende 10 palabras.', check: (s) => Object.keys(s.vocab).length >= 10 },
  { id: 'word_collector', emoji: '📚', title: 'Wortsammler', description: 'Aprende 30 palabras.', check: (s) => Object.keys(s.vocab).length >= 30 },
  { id: 'reviewer', emoji: '🔁', title: 'Fleißig', description: 'Haz 20 repasos de vocabulario.', check: (s) => s.stats.reviews >= 20 },
  { id: 'anmeldung', emoji: '📜', title: 'Offiziell Berliner:in', description: 'Completa el Anmeldung.', check: (s) => !!s.missions.buergeramt?.completed },
  { id: 'perfect', emoji: '⭐', title: 'Perfektionist', description: 'Consigue 3 estrellas en una misión.', check: (s) => Object.values(s.missions).some((m) => m.bestStars >= 3) },
  { id: 'speller', emoji: '🔤', title: 'Buchstabierprofi', description: 'Deletrea tu apellido sin errores.', check: (s) => s.flags.spelledPerfect === true },
  { id: 'local_friend', emoji: '👴', title: 'Berliner Schnauze', description: 'Haz amistad con Klaus en el Bürgeramt.', check: (s) => s.flags.klausFriend === true },
  { id: 'polite', emoji: '🎩', title: 'Höflich bleiben', description: 'Mantén la calma con la burocracia alemana.', check: (s) => s.flags.stayedPolite === true },
];
