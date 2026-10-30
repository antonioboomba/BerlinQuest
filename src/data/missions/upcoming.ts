import type { Mission } from '../../engine/types';

// Misiones ya diseñadas (objetivos, PNJ, recompensas) cuyo guion se escribirá en próximas entregas.
const stub = (m: Omit<Mission, 'playable' | 'start' | 'nodes'>): Mission => ({ ...m, playable: false, start: '', nodes: {} });

export const bar = stub({
  id: 'bar',
  locationId: 'neukoelln',
  title: 'Schicht im «Kater Karlo»',
  subtitle: 'Bar en Neukölln',
  description: 'Tu primer turno detrás de la barra. Toma comandas, recomienda cervezas, cobra y sobrevive al humor berlinés de los clientes.',
  cefr: 'A2',
  objectives: [
    { id: 'orders', text: 'Tomar 5 comandas sin errores' },
    { id: 'payment', text: 'Cobrar y dar el cambio («Stimmt so»)' },
    { id: 'complaint', text: 'Gestionar una queja con calma' },
    { id: 'tips', text: 'Ganar 20 € en propinas', optional: true },
  ],
  npcs: { mehmet: { name: 'Mehmet', role: 'Dueño del bar', emoji: '🧔🏽', color: '#f59e0b' } },
  rewardsPreview: ['💶 Sueldo + propinas', '🍺 Vocabulario de hostelería', '🗺️ Desbloquea Kreuzberg'],
});

export const wg = stub({
  id: 'wg',
  locationId: 'friedrichshain',
  title: 'WG-Abend',
  subtitle: 'Tu piso compartido',
  description: 'Reunión de piso: el plan de limpieza («Putzplan»), la factura de la luz y una fiesta el sábado. Negocia, opina y haz amigos.',
  cefr: 'A2',
  objectives: [
    { id: 'putzplan', text: 'Acordar el Putzplan' },
    { id: 'opinion', text: 'Dar tu opinión con «Ich finde, dass…»' },
    { id: 'party', text: 'Decidir sobre la fiesta del sábado' },
  ],
  npcs: { lea: { name: 'Lea', role: 'Compañera de piso', emoji: '👩🏼‍🎨', color: '#a855f7' } },
  rewardsPreview: ['🤝 Relación con tus compis', '🧩 Subordinadas con «dass»', '🎉 Evento: WG-Party'],
});

export const club = stub({
  id: 'club',
  locationId: 'kreuzberg',
  title: 'Der Gig',
  subtitle: 'Club en Kreuzberg',
  description: 'Convence a la bookerin de un club de que te deje tocar. Negocia caché, horario y equipo técnico. Alemán B1–B2.',
  cefr: 'B1',
  objectives: [
    { id: 'pitch', text: 'Presentar tu proyecto musical' },
    { id: 'fee', text: 'Negociar el caché (Gage)' },
    { id: 'tech', text: 'Acordar el rider técnico' },
  ],
  npcs: { nina: { name: 'Nina', role: 'Bookerin', emoji: '🎧', color: '#39ff88' } },
  rewardsPreview: ['🎤 Tu primer concierto', '💶 Gage', '🧩 Konjunktiv II para negociar'],
});
