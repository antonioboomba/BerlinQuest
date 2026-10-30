import type { Location } from '../engine/types';

export const LOCATIONS: Location[] = [
  {
    id: 'mitte', name: 'Bürgeramt Mitte', district: 'Mitte', emoji: '🏛️', missionId: 'buergeramt',
    x: 168, y: 100, unlock: { type: 'always' },
    blurb: 'El corazón administrativo. Aquí empieza todo: sin Anmeldung no eres nadie.',
  },
  {
    id: 'friedrichshain', name: 'Tu WG', district: 'Friedrichshain', emoji: '🏠', missionId: 'wg',
    x: 300, y: 104, unlock: { type: 'level', level: 3 },
    blurb: 'Tu piso compartido junto a la Warschauer Straße. Tres compis, una cocina, cero acuerdos.',
  },
  {
    id: 'neukoelln', name: 'Bar «Kater Karlo»', district: 'Neukölln', emoji: '🍺', missionId: 'bar',
    x: 236, y: 252, unlock: { type: 'mission', missionId: 'buergeramt' },
    blurb: 'Bar de barrio en la Weserstraße. Buscan personal… con papeles en regla.',
  },
  {
    id: 'kreuzberg', name: 'Club «Spreewerk»', district: 'Kreuzberg', emoji: '🎛️', missionId: 'club',
    x: 196, y: 180, unlock: { type: 'mission', missionId: 'bar' },
    blurb: 'Un club junto al canal. Si te ganas a la bookerin, tu música sonará aquí.',
  },
];

export const LOCATION_BY_ID: Record<string, Location> = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
