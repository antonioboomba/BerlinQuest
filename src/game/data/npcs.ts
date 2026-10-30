import { SPEAKERS as BASE } from './bar';

// Nombres y papeles de los NPC que hablan en diálogos (el aspecto está en art/characters.ts).
export const SPEAKERS: Record<string, { name: string; role: string }> = {
  ...BASE,
  sophie: { name: 'Sophie', role: 'Compañera de piso · estudia Arte' },
  emre: { name: 'Emre', role: 'Compañero de piso · berlinés' },
  durchsage: { name: 'Durchsage', role: 'Megafonía de la BVG' },
};
