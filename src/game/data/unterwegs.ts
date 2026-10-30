import type { Dialog } from './bar';

// Misión 04 — Unterwegs in Berlin. Trayecto real: U8 desde Moritzplatz (Kreuzberg) Richtung Wittenau,
// 3 estaciones: Heinrich-Heine-Straße → Jannowitzbrücke → Alexanderplatz (válido con «Kurzstrecke»).

export const U8_STOPS = ['Moritzplatz', 'Heinrich-Heine-Straße', 'Jannowitzbrücke', 'Alexanderplatz'];

/** Billetes de la máquina. Precios orientativos del juego (las tarifas reales de la BVG cambian). */
export const TICKETS = [
  { id: 'kurz', label: 'Kurzstrecke', sub: 'Hasta 3 estaciones de U-/S-Bahn · 2,60 €', price: 2.6, ok: true, best: true, feedback: '¡Perfecto! Moritzplatz → Alexanderplatz son 3 estaciones: la «Kurzstrecke» vale.' },
  { id: 'ab', label: 'Einzelfahrschein Berlin AB', sub: 'Billete sencillo zonas A y B · 3,80 €', price: 3.8, ok: true, best: false, feedback: 'Vale, sirve… pero para 3 estaciones la «Kurzstrecke» era más barata.' },
  { id: 'erm', label: 'Einzelfahrschein ermäßigt', sub: 'Billete reducido · 2,40 €', price: 2.4, ok: false, best: false, feedback: '«ermäßigt» es tarifa reducida, por ejemplo para niños de 6 a 14 años. Un adulto no puede usarlo.' },
  { id: 'rad', label: 'Fahrradkarte', sub: 'Billete para la bicicleta · 2,20 €', price: 2.2, ok: false, best: false, feedback: '«Fahrrad» = bicicleta. Ese billete es para llevar la bici, no para ti.' },
];

export const UNTERWEGS_DIALOGS: Record<string, Dialog> = {
  emre_trip_invite: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'emre',
        de: {
          A1: 'Hey {name}! Kennst du schon den Alexanderplatz? Lass uns heute dahin fahren!',
          B1: 'Sag mal, {name}, warst du schon am Alexanderplatz? Komm, ich zeig dir heute ein bisschen Berlin!',
        },
        es: {
          A1: '¡Eh, {name}! ¿Ya conoces Alexanderplatz? ¡Vamos hoy!',
          B1: 'Oye, {name}, ¿ya has estado en Alexanderplatz? Venga, hoy te enseño un poco de Berlín.',
        },
        choices: [
          { de: 'Gern! Wie fahren wir?', es: '¡Con gusto! ¿Cómo vamos?', next: 'b' },
          { de: 'Ja, gute Idee!', es: '¡Sí, buena idea!', next: 'b' },
        ],
      },
      b: {
        speaker: 'emre',
        de: {
          A1: 'Mit der U8. Die U-Bahn ist am Moritzplatz, gleich vor dem Haus. Fahr Richtung Wittenau, drei Stationen. Wir treffen uns an der Weltzeituhr!',
          B1: 'Ganz einfach: Nimm die U8 am Moritzplatz, Richtung Wittenau – das sind nur drei Stationen. Ich fahr schon vor, wir treffen uns an der Weltzeituhr!',
        },
        es: {
          A1: 'Con la U8. El metro está en Moritzplatz, justo delante de casa. Ve dirección Wittenau, tres estaciones. ¡Quedamos en el reloj mundial!',
          B1: 'Facilísimo: coge la U8 en Moritzplatz, dirección Wittenau; son solo tres estaciones. Yo voy delante: ¡quedamos en el reloj mundial!',
        },
        vocab: ['u_bahn', 'richtung', 'station'],
        action: 'trip:invited',
      },
    },
  },
  ubahn_plan: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sign',
        de: 'U8: Hermannstraße … Kottbusser Tor · ► MORITZPLATZ (Sie sind hier) · Heinrich-Heine-Straße · Jannowitzbrücke · Alexanderplatz … Wittenau',
        es: 'Plano de la línea U8. Estás en Moritzplatz. Tu destino: Alexanderplatz.',
        vocab: ['liniennetzplan'],
        choices: [
          { de: 'Richtung Wittenau', es: 'Dirección Wittenau', correct: true, next: 'b', feedback: 'Alexanderplatz está hacia Wittenau, en esa dirección de la línea.' },
          { de: 'Richtung Hermannstraße', es: 'Dirección Hermannstraße', correct: false, feedback: 'Mira el plano: Alexanderplatz está hacia Wittenau, no hacia Hermannstraße.' },
        ],
      },
      b: {
        speaker: 'sign',
        de: 'Wie viele Stationen sind es bis Alexanderplatz?',
        es: '¿Cuántas estaciones hay hasta Alexanderplatz?',
        choices: [
          { de: 'Zwei Stationen.', es: 'Dos estaciones.', correct: false, feedback: 'Cuenta otra vez: Heinrich-Heine-Straße (1), Jannowitzbrücke (2), Alexanderplatz (3).' },
          { de: 'Drei Stationen.', es: 'Tres estaciones.', correct: true, next: 'c', feedback: 'Exacto: drei Stationen. Con 3 o menos vale la «Kurzstrecke».', vocab: ['kurzstrecke'] },
          { de: 'Fünf Stationen.', es: 'Cinco estaciones.', correct: false, feedback: 'Menos: Heinrich-Heine-Straße, Jannowitzbrücke y Alexanderplatz.' },
        ],
      },
      c: {
        speaker: 'sign',
        de: 'Richtung Wittenau · Gleis 1. Bitte eine gültige Fahrkarte kaufen.',
        es: 'Dirección Wittenau: andén 1. Compre un billete válido, por favor.',
        vocab: ['gleis', 'fahrkarte'],
        action: 'trip:planned',
      },
    },
  },
  ubahn_before: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sign',
        de: 'U-Bahnhof Moritzplatz · U8 Richtung Wittenau / Hermannstraße',
        es: 'Estación de metro Moritzplatz, línea U8. (Viajar en metro llegará en la Misión 04.)',
        vocab: ['haltestelle'],
      },
    },
  },
  emre_alex: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'emre',
        de: {
          A1: 'Da bist du ja! Willkommen am Alex! Das ist die Weltzeituhr. Hier treffen sich alle.',
          B1: 'Na endlich, da bist du ja! Willkommen am Alex! Das hier ist die Weltzeituhr – hier verabreden sich die Berliner seit Jahrzehnten.',
        },
        es: {
          A1: '¡Ahí estás! ¡Bienvenido/a al Alex! Este es el reloj mundial. Aquí queda todo el mundo.',
          B1: '¡Por fin, ahí estás! ¡Bienvenido/a al Alex! Este es el reloj mundial: los berlineses quedan aquí desde hace décadas.',
        },
        vocab: ['weltzeituhr'],
        choices: [{ de: 'Wow, und da ist der Fernsehturm!', es: '¡Guau, y ahí está la torre de televisión!', next: 'b', vocab: ['fernsehturm'] }],
      },
      b: {
        speaker: 'emre',
        de: { A1: 'Genau! Sag mal, wie spät ist es? Schau auf die Uhr: 19:15.', B1: 'Genau! Und – wie spät ist es eigentlich? Die Uhr zeigt 19:15.' },
        es: { A1: '¡Exacto! Oye, ¿qué hora es? Mira el reloj: 19:15.', B1: '¡Exacto! Y, por cierto, ¿qué hora es? El reloj marca las 19:15.' },
        choices: [
          { de: 'Es ist Viertel nach sieben.', es: 'Son las siete y cuarto.', correct: true, next: 'c', feedback: '«Viertel nach» = y cuarto. En la calle se usa el reloj de 12 horas.', vocab: ['viertel_nach'] },
          { de: 'Es ist Viertel vor sieben.', es: 'Son las siete menos cuarto.', correct: false, feedback: '«Viertel vor sieben» = 6:45. Para 7:15: «Viertel nach sieben».' },
          { de: 'Es ist halb sieben.', es: 'Son las seis y media.', correct: false, feedback: '«halb sieben» = 6:30 (media hora antes de las siete).' },
        ],
      },
      c: {
        speaker: 'emre',
        de: { A1: 'Super! Du kennst jetzt die U-Bahn. Jetzt kannst du überall hinfahren!', B1: 'Super! Jetzt kennst du dich mit der U-Bahn aus – ab heute gehört dir die ganze Stadt.' },
        es: { A1: '¡Genial! Ya conoces el metro. ¡Ahora puedes ir a todas partes!', B1: '¡Genial! Ya te manejas con el metro: desde hoy la ciudad entera es tuya.' },
        action: 'quest:complete_unterwegs',
      },
    },
  },
  emre_alex_idle: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'emre',
        de: 'Ich bleibe noch ein bisschen hier. Fahr ruhig zurück – U8 Richtung Hermannstraße!',
        es: 'Yo me quedo un rato. Vuelve tranquilo/a: ¡U8 dirección Hermannstraße!',
      },
    },
  },
};
