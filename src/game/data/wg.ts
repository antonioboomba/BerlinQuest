import type { Dialog } from './bar';

// Diálogos de la Misión 03 (Die WG). Anna recuerda la Anmeldung; los compañeros explican la convivencia.

export const WG_DIALOGS: Record<string, Dialog> = {
  anna_wg_invite: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'anna',
        de: {
          A1: '{name}! Du hast deine Anmeldung geschafft? Super! Dann bist du jetzt offiziell mein Mieter!',
          B1: '{name}! Ich habe gehört, du hast die Anmeldung geschafft – herzlichen Glückwunsch! Jetzt wohnst du offiziell hier.',
        },
        es: {
          A1: '¡{name}! ¿Has conseguido empadronarte? ¡Genial! ¡Ahora eres oficialmente mi inquilino/a!',
          B1: '¡{name}! Me han dicho que ya tienes la Anmeldung, ¡enhorabuena! Ahora vives aquí oficialmente.',
        },
        choices: [
          { de: 'Ja, endlich! Danke für die Hilfe.', es: '¡Sí, por fin! Gracias por la ayuda.', next: 'b' },
          { de: 'Ja, das Bürgeramt war lang!', es: '¡Sí, el Bürgeramt fue largo!', next: 'b' },
        ],
      },
      b: {
        speaker: 'anna',
        de: {
          A1: 'Dein Zimmer ist jetzt fertig. Komm in die WG! Sophie und Emre warten schon.',
          B1: 'Dein Zimmer ist endlich fertig. Komm doch rein – deine Mitbewohner Sophie und Emre wollen dich kennenlernen!',
        },
        es: {
          A1: 'Tu habitación ya está lista. ¡Ven al piso! Sophie y Emre ya te esperan.',
          B1: 'Por fin tu habitación está lista. Entra: tus compañeros de piso, Sophie y Emre, quieren conocerte.',
        },
        vocab: ['wg', 'mitbewohner', 'zimmer'],
        action: 'wg:invited',
      },
    },
  },
  anna_after_wg: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'anna',
        de: 'Na, wie gefällt dir die WG? Sophie und Emre sind wirklich nett, oder?',
        es: '¿Qué tal en el piso? Sophie y Emre son muy majos, ¿verdad?',
        choices: [{ de: 'Ja, sehr! Danke, Anna.', es: '¡Sí, mucho! Gracias, Anna.' }],
      },
    },
  },

  wg_sophie_meet: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sophie',
        de: { A1: 'Hi! Ich bin Sophie. Ich studiere Kunst. Und du?', B1: 'Hey, du musst der Neue sein! Ich bin Sophie, ich studiere Kunst an der UdK. Und was machst du so?' },
        es: { A1: '¡Hola! Soy Sophie. Estudio Arte. ¿Y tú?', B1: '¡Hola, tú debes de ser el/la nuevo/a! Soy Sophie, estudio Arte en la UdK. ¿Y tú a qué te dedicas?' },
        choices: [
          { de: 'Ich bin {name}. Ich arbeite in einer Bar.', es: 'Soy {name}. Trabajo en un bar.', correct: true, next: 'b', feedback: '«arbeiten in» + dativo: in einer Bar.' },
          { de: 'Ich bin Kunst.', es: 'Soy arte.', correct: false, feedback: '😄 «Ich bin Kunst» = «soy arte». Preséntate: «Ich bin {name}. Ich arbeite …».' },
        ],
      },
      b: {
        speaker: 'sophie',
        de: {
          A1: 'Cool! Deine Kisten stehen im Flur. Die Lampe kommt auf den Schreibtisch, die Bücher ins Regal und das Kissen aufs Bett.',
          B1: 'Cool! Deine Umzugskartons stehen noch im Flur. Stell die Lampe auf den Schreibtisch, die Bücher ins Regal und das Kissen aufs Bett.',
        },
        es: {
          A1: '¡Guay! Tus cajas están en el pasillo. La lámpara va sobre el escritorio, los libros en la estantería y el cojín en la cama.',
          B1: '¡Guay! Tus cajas de la mudanza siguen en el pasillo. Pon la lámpara sobre el escritorio, los libros en la estantería y el cojín en la cama.',
        },
        vocab: ['umzugskarton', 'flur', 'lampe', 'schreibtisch', 'buch', 'regal', 'kissen', 'bett'],
        action: 'wg:met_sophie',
      },
    },
  },
  wg_emre_meet: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'emre',
        de: { A1: 'Hey, ich bin Emre! Woher kommst du?', B1: 'Na, du bist also unser neuer Mitbewohner? Ich bin Emre. Woher kommst du eigentlich?' },
        es: { A1: '¡Hola, soy Emre! ¿De dónde eres?', B1: '¿Así que eres nuestro/a nuevo/a compañero/a de piso? Soy Emre. ¿De dónde eres, por cierto?' },
        choices: [
          { de: 'Ich komme aus Spanien.', es: 'Soy de España.', correct: true, next: 'b' },
          { de: 'Ich komme von Spanien.', es: '—', correct: false, feedback: 'Para el país de origen se usa «aus»: «Ich komme aus Spanien».' },
        ],
      },
      b: {
        speaker: 'emre',
        de: {
          A1: 'Cool! Ich bin Berliner. Meine Familie kommt aus Izmir. Die Küche ist hier – mach dich wie zu Hause!',
          B1: 'Cool! Ich bin hier in Kreuzberg geboren, meine Familie kommt aus Izmir. Hier ist die Küche – fühl dich wie zu Hause!',
        },
        es: {
          A1: '¡Guay! Yo soy berlinés. Mi familia es de Esmirna. La cocina está aquí: ¡estás en tu casa!',
          B1: '¡Guay! Yo nací aquí en Kreuzberg; mi familia es de Esmirna. Esta es la cocina: ¡siéntete como en casa!',
        },
        vocab: ['kueche'],
        action: 'wg:met_emre',
      },
    },
  },

  wg_conflict: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'emre',
        de: {
          A1: 'Hey! Wer hat das Geschirr nicht gespült? Die Spüle ist voll!',
          B1: 'Sag mal, wer hat denn das ganze Geschirr in der Spüle stehen lassen? Das geht so nicht!',
          B2: 'Ey, wer hat schon wieder das Geschirr stehen lassen? In der Spüle stapelt sich alles!',
        },
        es: {
          A1: '¡Eh! ¿Quién no ha fregado los platos? ¡El fregadero está lleno!',
          B1: 'Oye, ¿quién ha dejado toda la vajilla en el fregadero? ¡Así no puede ser!',
          B2: 'Oye, ¿quién ha vuelto a dejar los platos sin fregar? ¡En el fregadero se amontona todo!',
        },
        vocab: ['geschirr', 'spuelen', 'spuele'],
        choices: [
          { de: 'Entschuldigung, das war ich. Ich spüle sofort.', es: 'Perdona, fui yo. Friego ahora mismo.', correct: true, next: 'b', feedback: 'Bien: disculparse y ofrecer una solución.' },
          { de: 'Nicht mein Problem.', es: 'No es mi problema.', correct: false, feedback: 'En una WG la convivencia es clave: mejor disculparse y ayudar.' },
          { de: 'Das war Sophie!', es: '¡Fue Sophie!', correct: false, feedback: 'Echar la culpa a otro no ayuda… y Sophie no estaba.' },
        ],
      },
      b: {
        speaker: 'emre',
        de: {
          A1: 'Danke! Und bitte trag dich in den Putzplan ein. Er hängt am Kühlschrank.',
          B1: 'Danke dir! Und trag dich bitte in unseren Putzplan ein – der hängt am Kühlschrank.',
        },
        es: {
          A1: '¡Gracias! Y por favor apúntate en el plan de limpieza. Está en la nevera.',
          B1: '¡Gracias! Y apúntate, por favor, en nuestro plan de limpieza: está colgado en la nevera.',
        },
        vocab: ['putzplan'],
        action: 'wg:wash',
      },
    },
  },
  wg_putzplan: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sign',
        de: 'PUTZPLAN – Woche 41. Welche Aufgabe übernimmst du?',
        es: 'PLAN DE LIMPIEZA – semana 41. ¿Qué tarea asumes?',
        vocab: ['putzen', 'muell', 'bad'],
        choices: [
          { de: 'Ich putze diese Woche das Bad.', es: 'Esta semana limpio el baño.', action: 'wg:signed' },
          { de: 'Ich bringe den Müll raus.', es: 'Saco la basura.', action: 'wg:signed' },
          { de: 'Ich putze die Küche.', es: 'Limpio la cocina.', action: 'wg:signed' },
        ],
      },
    },
  },
  wg_sophie_idle: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'sophie',
        de: 'Willkommen in der WG! Hier ist jetzt auch dein Zuhause.',
        es: '¡Bienvenido/a al piso! Ahora esta también es tu casa.',
        vocab: ['zuhause'],
      },
    },
  },
  boss_memory: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: 'Na, meine beste Aushilfe! Du wohnst jetzt in der WG bei Anna, oder? Wenn du mal wieder Arbeit brauchst – du weißt, wo ich bin!',
        es: '¡Hombre, mi mejor ayudante! Ahora vives en el piso de Anna, ¿no? Si vuelves a necesitar trabajo, ¡ya sabes dónde estoy!',
      },
    },
  },
  wg_emre_idle: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'emre',
        de: 'Alles sauber, danke! So macht WG-Leben Spaß.',
        es: '¡Todo limpio, gracias! Así da gusto vivir en un piso compartido.',
      },
    },
  },
};
