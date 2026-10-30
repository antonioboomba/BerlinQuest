import type { CEFR, LevelText } from '../../engine/types';

// ───────────── Bebidas ─────────────

export interface Drink {
  id: string;
  /** id de vocabulario */
  vocab: string;
  de: string;
  article: 'der' | 'die' | 'das';
  es: string;
  price: number;
}

export const DRINKS: Drink[] = [
  { id: 'bier', vocab: 'bier', de: 'Bier', article: 'das', es: 'cerveza', price: 3 },
  { id: 'wein', vocab: 'wein', de: 'Wein', article: 'der', es: 'vino', price: 4 },
  { id: 'cola', vocab: 'cola', de: 'Cola', article: 'die', es: 'cola', price: 2 },
  { id: 'wasser', vocab: 'wasser', de: 'Wasser', article: 'das', es: 'agua', price: 2 },
  { id: 'schorle', vocab: 'apfelschorle', de: 'Apfelschorle', article: 'die', es: 'zumo de manzana con gas', price: 2.5 },
];

export const DRINK_BY_ID: Record<string, Drink> = Object.fromEntries(DRINKS.map((d) => [d.id, d]));

/** Artículo indefinido en acusativo: ein Bier, einen Wein, eine Cola. */
export function indefAkk(d: Drink): string {
  return d.article === 'der' ? `einen ${d.de}` : d.article === 'die' ? `eine ${d.de}` : `ein ${d.de}`;
}

/** Negación en acusativo: kein Bier, keinen Wein, keine Cola. */
export function keinAkk(d: Drink): string {
  return d.article === 'der' ? `keinen ${d.de}` : d.article === 'die' ? `keine ${d.de}` : `kein ${d.de}`;
}

// ───────────── Pedidos por nivel ─────────────

export interface Order {
  drink: string;
  de: string;
  es: string;
  /** vocabulario extra que se aprende con este pedido */
  vocab?: string[];
}

export const ORDERS: Record<CEFR, Order[]> = {
  A1: [
    { drink: 'bier', de: 'Ein Bier, bitte.', es: 'Una cerveza, por favor.', vocab: ['bitte'] },
    { drink: 'cola', de: 'Eine Cola, bitte.', es: 'Una cola, por favor.', vocab: ['bitte'] },
    { drink: 'wasser', de: 'Ein Wasser, bitte.', es: 'Un agua, por favor.', vocab: ['bitte'] },
    { drink: 'wein', de: 'Einen Wein, bitte.', es: 'Un vino, por favor.', vocab: ['bitte'] },
  ],
  A2: [
    { drink: 'wein', de: 'Ich nehme ein Glas Wein.', es: 'Tomo una copa de vino.' },
    { drink: 'schorle', de: 'Hast du Apfelschorle?', es: '¿Tienes zumo de manzana con gas?' },
    { drink: 'bier', de: 'Für mich ein Bier, bitte.', es: 'Para mí una cerveza, por favor.' },
    { drink: 'cola', de: 'Eine Cola mit Eis, bitte.', es: 'Una cola con hielo, por favor.' },
  ],
  B1: [
    { drink: 'schorle', de: 'Ich hätte gern etwas ohne Alkohol – vielleicht eine Apfelschorle?', es: 'Querría algo sin alcohol… ¿quizá un zumo de manzana con gas?', vocab: ['ich_haette_gern'] },
    { drink: 'wein', de: 'Könnte ich ein Glas Rotwein bekommen?', es: '¿Me podrías poner una copa de vino tinto?' },
    { drink: 'wasser', de: 'Ein Mineralwasser bitte, aber mit Kohlensäure.', es: 'Un agua mineral, pero con gas.', vocab: ['kohlensaeure'] },
    { drink: 'bier', de: 'Ich hätte gern ein frisch gezapftes Bier.', es: 'Querría una cerveza de barril.', vocab: ['ich_haette_gern'] },
  ],
  B2: [
    { drink: 'bier', de: 'Mach mir mal ’n Pils, ja?', es: 'Ponme una pils (cerveza), ¿vale?' },
    { drink: 'cola', de: 'Ich bin mit dem Auto da – also nur ’ne Cola.', es: 'He venido en coche, así que solo una cola.' },
    { drink: 'wasser', de: 'Gib mir einfach was ohne Geschmack, mit Sprudel.', es: 'Dame algo sin sabor, con burbujas.' },
    { drink: 'schorle', de: 'Was Fruchtiges ohne Alkohol wär’ super – so ’ne Schorle.', es: 'Algo afrutado sin alcohol estaría genial, una de esas Schorle.' },
  ],
};

export const THANKS = ['Danke schön!', 'Danke! Sehr gut!', 'Perfekt, danke!', 'Super, vielen Dank!'];
export const THANKS_ES = ['¡Muchas gracias!', '¡Gracias! ¡Muy bien!', '¡Perfecto, gracias!', '¡Genial, muchas gracias!'];

// ───────────── Diálogos ─────────────

export interface DChoice {
  de: string;
  es: string;
  correct?: boolean;
  feedback?: string;
  next?: string;
  action?: string;
  vocab?: string[];
}

export interface DNode {
  speaker: string;
  de: LevelText;
  es: LevelText;
  vocab?: string[];
  choices?: DChoice[];
  next?: string;
  action?: string;
}

export interface Dialog {
  start: string;
  nodes: Record<string, DNode>;
}

export const SPEAKERS: Record<string, { name: string; role: string }> = {
  mehmet: { name: 'Mehmet', role: 'Dueño del bar' },
  anna: { name: 'Anna', role: 'Vecina' },
  jonas: { name: 'Jonas', role: 'Estudiante' },
  klaus: { name: 'Klaus', role: 'Jubilado berlinés' },
  lea: { name: 'Lea', role: 'DJ' },
  guest4: { name: 'Mia', role: 'Amiga de Lea' },
  bouncer: { name: 'Türsteher', role: 'Portero del club' },
  sign: { name: 'Cartel', role: '' },
  empfang: { name: 'Frau Lange', role: 'Recepción del Bürgeramt' },
  yilmaz: { name: 'Frau Yilmaz', role: 'Funcionaria · Platz 3' },
  becker: { name: 'Herr Becker', role: 'Funcionario · Platz 1' },
  schmidt: { name: 'Frau Schmidt', role: 'Funcionaria · Platz 2' },
  official: { name: 'Funcionario/a', role: 'Bürgeramt' },
};

export const DIALOGS: Record<string, Dialog> = {
  boss_intro: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: { A1: 'Hallo! Bist du die neue Aushilfe?', B1: 'Na endlich! Du bist die neue Aushilfe, oder?', B2: 'Ah, da bist du ja! Die neue Aushilfe, nehm’ ich an?' },
        es: { A1: '¡Hola! ¿Eres el/la nuevo/a ayudante?', B1: '¡Por fin! Eres el/la nuevo/a ayudante, ¿no?', B2: '¡Ah, ahí estás! El/la nuevo/a ayudante, supongo.' },
        vocab: ['aushilfe'],
        choices: [
          { de: 'Ja, genau! Ich bin {name}.', es: '¡Sí, exacto! Soy {name}.', correct: true, next: 'b', feedback: '«Ich bin + nombre» para presentarte.' },
          { de: 'Nein, ich bin ein Bier.', es: 'No, soy una cerveza.', correct: false, feedback: '😅 «Ich bin ein Bier» = «soy una cerveza». Prueba otra vez.' },
          { de: 'Wie bitte?', es: '¿Cómo?', next: 'a2', vocab: ['wie_bitte'] },
        ],
      },
      a2: {
        speaker: 'mehmet',
        de: 'Bist – du – die – neue – Aushilfe? Die neue Kellnerin oder der neue Kellner?',
        es: '¿Eres – el/la – nuevo/a – ayudante? ¿La nueva camarera o el nuevo camarero?',
        choices: [{ de: 'Ach so! Ja, ich bin {name}.', es: '¡Ah, vale! Sí, soy {name}.', correct: true, next: 'b' }],
      },
      b: {
        speaker: 'mehmet',
        de: {
          A1: 'Super! Ich bin Mehmet. Die Getränke sind im Kühlschrank. Die Gäste bestellen an der Theke. Du bringst die Getränke.',
          B1: 'Super, ich bin Mehmet. Also: Die Gäste bestellen an der Theke, die Getränke holst du aus dem Kühlschrank da rechts und bringst sie ihnen.',
        },
        es: {
          A1: '¡Genial! Soy Mehmet. Las bebidas están en la nevera. Los clientes piden en la barra. Tú llevas las bebidas.',
          B1: 'Genial, soy Mehmet. A ver: los clientes piden en la barra; tú sacas las bebidas de la nevera de la derecha y se las llevas.',
        },
        vocab: ['kuehlschrank', 'theke', 'getraenk', 'gast'],
        choices: [
          { de: 'Alles klar!', es: '¡Entendido!', next: 'c' },
          { de: 'Was ist ein Kühlschrank?', es: '¿Qué es un «Kühlschrank»?', next: 'b2' },
        ],
      },
      b2: {
        speaker: 'mehmet',
        de: 'Der Kühlschrank! Da rechts, mit dem blauen Licht. Kalt, Getränke drin – verstehst du?',
        es: '¡La nevera! Ahí a la derecha, la de la luz azul. Fría, con bebidas dentro, ¿entiendes?',
        next: 'c',
      },
      c: {
        speaker: 'mehmet',
        de: { A1: 'Da kommt schon ein Gast. Los geht’s!', B1: 'Schau, da kommt schon der erste Gast. Viel Erfolg!' },
        es: { A1: 'Ya viene un cliente. ¡Vamos!', B1: 'Mira, ya llega el primer cliente. ¡Mucha suerte!' },
        action: 'quest:serve',
      },
    },
  },
  boss_busy: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: { A1: 'Die Gäste warten! Hör gut zu, was sie bestellen.', B1: 'Die Gäste warten! Hör genau hin, was sie bestellen – und dann ab zum Kühlschrank.' },
        es: { A1: '¡Los clientes esperan! Escucha bien lo que piden.', B1: '¡Los clientes esperan! Escucha bien lo que piden y luego, a la nevera.' },
      },
    },
  },
  boss_pay: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: { A1: 'Super gemacht! Hier ist dein Lohn: dreißig Euro.', B1: 'Klasse Arbeit! Hier ist dein Lohn für heute, dreißig Euro. Das Trinkgeld darfst du behalten.' },
        es: { A1: '¡Muy bien hecho! Aquí está tu sueldo: treinta euros.', B1: '¡Buen trabajo! Aquí tienes tu sueldo de hoy, treinta euros. La propina te la puedes quedar.' },
        vocab: ['lohn', 'trinkgeld'],
        choices: [
          { de: 'Danke schön! Bis morgen!', es: '¡Muchas gracias! ¡Hasta mañana!', next: 'b' },
          { de: 'Nur dreißig Euro?', es: '¿Solo treinta euros?', next: 'b3' },
        ],
      },
      b3: {
        speaker: 'mehmet',
        de: 'Haha, für den ersten Tag ist das gut! Und das Trinkgeld ist extra.',
        es: '¡Jaja, para el primer día está bien! Y la propina va aparte.',
        next: 'b',
      },
      b: {
        speaker: 'mehmet',
        de: 'Feierabend! Du kannst gern weiter helfen, wenn du willst.',
        es: '¡Se acabó la jornada! Puedes seguir ayudando si quieres.',
        vocab: ['feierabend'],
        action: 'quest:pay',
      },
    },
  },
  boss_free: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: 'Du machst das super. Jedes Getränk bringt Trinkgeld!',
        es: 'Lo haces genial. ¡Cada bebida trae propina!',
      },
    },
  },
  anna: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'anna',
        de: { A1: 'Hallo! Arbeitest du heute lange?', B1: 'Hey! Na, musst du heute lange arbeiten?' },
        es: { A1: '¡Hola! ¿Trabajas mucho hoy?', B1: '¡Hey! ¿Qué, hoy te toca trabajar hasta tarde?' },
        choices: [
          { de: 'Ja, bis Mitternacht.', es: 'Sí, hasta medianoche.', next: 'late', vocab: ['mitternacht'] },
          { de: 'Nein, nur ein paar Stunden.', es: 'No, solo unas horas.', next: 'short' },
          { de: 'Ich weiß nicht.', es: 'No lo sé.', next: 'idk' },
        ],
      },
      late: { speaker: 'anna', de: 'Oh, armer Schatz! Dann viel Kraft.', es: '¡Ay, pobre! Pues mucho ánimo.' },
      short: { speaker: 'anna', de: 'Schön! Dann hast du heute Abend noch Zeit.', es: '¡Qué bien! Entonces esta noche aún tienes tiempo.' },
      idk: { speaker: 'anna', de: 'Haha, typisch Gastro! Man weiß es nie.', es: 'Jaja, ¡típico de la hostelería! Nunca se sabe.' },
    },
  },
  anna_new: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'anna',
        de: { A1: 'Hallo! Bist du neu hier? Die Bar sucht eine Aushilfe!', B1: 'Hi! Du bist neu im Kiez, oder? Mehmet von der Bar sucht übrigens dringend eine Aushilfe.' },
        es: { A1: '¡Hola! ¿Eres nuevo/a aquí? ¡El bar busca un/a ayudante!', B1: '¡Hola! Eres nuevo/a en el barrio, ¿no? Por cierto, Mehmet, el del bar, busca ayudante urgentemente.' },
        vocab: ['aushilfe'],
        choices: [
          { de: 'Danke! Wo ist die Bar?', es: '¡Gracias! ¿Dónde está el bar?', next: 'b' },
          { de: 'Ja, ich bin neu. Ich heiße {name}.', es: 'Sí, soy nuevo/a. Me llamo {name}.', next: 'c' },
        ],
      },
      b: { speaker: 'anna', de: 'Da drüben, mit dem roten Licht. Du kannst sie nicht verpassen!', es: 'Allí, la de la luz roja. ¡No tiene pérdida!', vocab: ['da_drueben'] },
      c: { speaker: 'anna', de: 'Freut mich, {name}! Ich bin Anna. Ich wohne hier im Haus.', es: '¡Encantada, {name}! Soy Anna. Vivo aquí en este edificio.' },
    },
  },
  jonas: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'jonas',
        de: { A1: 'Entschuldigung, wo ist die U-Bahn?', B1: 'Sorry, kurze Frage: Wo ist hier die nächste U-Bahn-Station?' },
        es: { A1: 'Perdona, ¿dónde está el metro?', B1: 'Perdona, una pregunta rápida: ¿dónde está la estación de metro más cercana?' },
        choices: [
          { de: 'Da drüben, beim blauen Schild mit dem U.', es: 'Allí, junto al cartel azul con la U.', correct: true, next: 'ok', vocab: ['da_drueben'], feedback: '«da drüben» = allí, al otro lado.' },
          { de: 'Ich bin die U-Bahn.', es: 'Soy el metro.', correct: false, feedback: '😄 Eso significa «soy el metro». Señala el lugar: «Da drüben…».' },
          { de: 'Keine Ahnung, sorry.', es: 'Ni idea, lo siento.', next: 'meh' },
        ],
      },
      ok: { speaker: 'jonas', de: 'Ah, super, danke! Tschüss!', es: '¡Ah, genial, gracias! ¡Chao!' },
      meh: { speaker: 'jonas', de: 'Kein Problem, ich frag’ jemand anderen.', es: 'No pasa nada, le preguntaré a otra persona.' },
    },
  },
  klaus: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'klaus',
        de: 'Na, wie jeht’s? Ick sitz’ hier jeden Abend. Schön, wa?',
        es: '(en berlinés) ¿Qué tal? Me siento aquí cada noche. Bonito, ¿eh?',
        choices: [
          { de: 'Ja, sehr schön!', es: '¡Sí, muy bonito!', next: 'b' },
          { de: 'Wie bitte?', es: '¿Cómo?', next: 'hoch', vocab: ['wie_bitte'] },
        ],
      },
      hoch: {
        speaker: 'klaus',
        de: 'Ach so! Auf Hochdeutsch: «Wie geht’s? Ich sitze hier jeden Abend. Schön, nicht wahr?»',
        es: '¡Ah! En alemán estándar: «¿Qué tal? Me siento aquí cada noche. Bonito, ¿verdad?» (berlinés: ick = ich, jeht = geht, wa = nicht wahr)',
        vocab: ['ick'],
        next: 'b',
      },
      b: { speaker: 'klaus', de: 'Det is’ Kreuzberg. Hier is’ immer wat los.', es: 'Esto es Kreuzberg. Aquí siempre pasa algo. (det = das, wat = was)' },
    },
  },
  lea: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'lea',
        de: { A1: 'Hey! Schön hier, oder?', B1: 'Hey! Schöner Abend heute, oder? Ich lege später im Club auf.' },
        es: { A1: '¡Hey! Bonito esto, ¿no?', B1: '¡Hey! Qué noche más bonita, ¿no? Luego pincho en el club.' },
        choices: [
          { de: 'Ja, stimmt!', es: '¡Sí, es verdad!', next: 'b', vocab: ['stimmt'] },
          { de: 'Nein, es ist kalt.', es: 'No, hace frío.', next: 'c' },
        ],
      },
      b: { speaker: 'lea', de: 'Berlin im Herbst – einfach toll.', es: 'Berlín en otoño: simplemente genial.' },
      c: { speaker: 'lea', de: 'Haha, typisch Berlin. Zieh dir was Warmes an!', es: 'Jaja, típico de Berlín. ¡Abrígate!' },
    },
  },
  bouncer: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'bouncer',
        de: 'Heute nicht.',
        es: 'Hoy no.',
        choices: [
          { de: 'Warum nicht?', es: '¿Por qué no?', next: 'b' },
          { de: 'Okay, tschüss.', es: 'Vale, adiós.' },
        ],
      },
      b: {
        speaker: 'bouncer',
        de: 'Der Club öffnet erst um Mitternacht. Und nur mit Gästeliste.',
        es: 'El club no abre hasta medianoche. Y solo con lista de invitados.',
        vocab: ['mitternacht'],
      },
    },
  },
  buergeramt_door: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sign',
        de: 'Heute geschlossen. Öffnungszeiten: Montag bis Freitag, 8 bis 15 Uhr.',
        es: 'Hoy cerrado. Horario: de lunes a viernes, de 8 a 15 h. (Interior del Bürgeramt: próximamente.)',
        vocab: ['geschlossen', 'buergeramt'],
      },
    },
  },
  home_door: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sign',
        de: 'Klingelschild: «WG – 3. OG»',
        es: 'Placa del timbre: «Piso compartido – 3.ª planta». (Interior de tu piso: próximamente.)',
      },
    },
  },
  spaeti: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sign',
        de: 'SPÄTI – Täglich bis 2 Uhr geöffnet. Getränke, Snacks, Zeitungen.',
        es: 'SPÄTI (tienda de barrio): abierto todos los días hasta las 2. Bebidas, snacks, periódicos.',
        vocab: ['spaeti', 'geoeffnet'],
      },
    },
  },
  ubahn: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sign',
        de: 'U8 Richtung Wittenau – nächster Zug in 3 Minuten.',
        es: 'U8 dirección Wittenau: próximo tren en 3 minutos. (Viajar en U-Bahn: próximamente.)',
        vocab: ['haltestelle'],
      },
    },
  },
};
