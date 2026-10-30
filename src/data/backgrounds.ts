import type { Background } from '../engine/types';

export const BACKGROUNDS: Record<Background, { title: string; de: string; emoji: string; money: number; items: string[]; blurb: string }> = {
  musician: {
    title: 'Músico/a',
    de: 'Musiker:in',
    emoji: '🎸',
    money: 320,
    items: ['gitarre'],
    blurb: 'Vienes a tocar en la escena de clubs de Berlín. Empiezas con tu guitarra y poco dinero.',
  },
  gastro: {
    title: 'Hostelería',
    de: 'Gastro',
    emoji: '🍺',
    money: 380,
    items: ['kellnerblock'],
    blurb: 'Tienes experiencia en bares. Trabajar en Neukölln te espera… si te registras primero.',
  },
  student: {
    title: 'Estudiante',
    de: 'Student:in',
    emoji: '🎓',
    money: 450,
    items: ['woerterbuch'],
    blurb: 'Llegas con una beca y un diccionario de bolsillo. Más ahorros, menos calle.',
  },
};
