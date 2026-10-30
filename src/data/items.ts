import type { Item } from '../engine/types';

const list: Item[] = [
  { id: 'reisepass', name: 'Pasaporte', de: 'der Reisepass', emoji: '🛂', description: 'Tu documento de identidad. Imprescindible en cualquier Amt.' },
  { id: 'handy', name: 'Móvil', de: 'das Handy', emoji: '📱', description: 'En Alemania el móvil se llama «Handy». Sí, de verdad.' },
  { id: 'schluessel', name: 'Llaves del piso', de: 'der Wohnungsschlüssel', emoji: '🔑', description: 'Las llaves de tu habitación en Friedrichshain.' },
  { id: 'gitarre', name: 'Guitarra', de: 'die Gitarre', emoji: '🎸', description: 'Tu compañera de viaje. Algún día sonará en un club.' },
  { id: 'kellnerblock', name: 'Libreta de camarero', de: 'der Kellnerblock', emoji: '📒', description: 'Para apuntar comandas. Útil en la misión del bar.' },
  { id: 'woerterbuch', name: 'Diccionario', de: 'das Wörterbuch', emoji: '📕', description: 'Diccionario de bolsillo español-alemán.' },
  { id: 'wgb', name: 'Confirmación del casero', de: 'die Wohnungsgeberbestätigung', emoji: '📄', description: 'Formulario firmado por tu casero. Sin él no hay Anmeldung.' },
  { id: 'wartenummer', name: 'Número de espera', de: 'die Wartenummer', emoji: '🎫', description: 'B-127. Paciencia.' },
  { id: 'kaffee', name: 'Café de máquina', de: 'der Kaffee', emoji: '☕', description: 'Mejor que nada.' },
  { id: 'formular_leer', name: 'Formulario en blanco', de: 'das Anmeldeformular (leer)', emoji: '📃', description: 'Hay que rellenarlo en el atril.' },
  { id: 'anmeldeformular', name: 'Formulario rellenado', de: 'das Anmeldeformular', emoji: '📝', description: 'Tus datos, listos para la funcionaria.' },
  { id: 'anmeldebestaetigung', name: 'Certificado de empadronamiento', de: 'die Anmeldebestätigung', emoji: '📜', description: 'La prueba de que vives oficialmente en Berlín. Abre muchas puertas.' },
];

export const ITEMS: Record<string, Item> = Object.fromEntries(list.map((i) => [i.id, i]));
