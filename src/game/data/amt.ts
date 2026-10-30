import type { Dialog } from './bar';

// Diálogos de la Misión 02 (Anmeldung). Texto adaptado por nivel: A1 corto, B1 natural, B2 burocrático.

export const AMT_DIALOGS: Record<string, Dialog> = {
  // Mehmet, al terminar el turno: encarga la Anmeldung
  boss_amt: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: {
          A1: 'Noch etwas: Hast du schon eine Anmeldung? Ohne Anmeldung kann ich dich nicht anstellen.',
          B1: 'Ach, noch was: Hast du dich schon angemeldet? Ohne Anmeldung kann ich dich leider nicht offiziell anstellen.',
          B2: 'Eine Sache noch: Bist du schon angemeldet? Ohne Meldebescheinigung kann ich dich nicht offiziell beschäftigen.',
        },
        es: {
          A1: 'Otra cosa: ¿ya estás empadronado/a? Sin empadronamiento no puedo contratarte.',
          B1: 'Ah, otra cosa: ¿ya te has empadronado? Sin empadronamiento no puedo contratarte oficialmente.',
          B2: 'Una última cosa: ¿ya estás empadronado/a? Sin certificado de empadronamiento no puedo darte de alta oficialmente.',
        },
        vocab: ['anmeldung', 'sich_anmelden'],
        choices: [
          { de: 'Nein, noch nicht.', es: 'No, todavía no.', next: 'b' },
          { de: 'Was ist eine Anmeldung?', es: '¿Qué es una Anmeldung?', next: 'what' },
        ],
      },
      what: {
        speaker: 'mehmet',
        de: 'Du meldest deine Adresse beim Bürgeramt an. Das muss man in Deutschland in zwei Wochen machen.',
        es: 'Registras tu dirección en el Bürgeramt. En Alemania hay que hacerlo en dos semanas.',
        next: 'b',
      },
      b: {
        speaker: 'mehmet',
        de: {
          A1: 'Geh zum Bürgeramt. Aber zuerst: Anna gibt dir die Wohnungsgeberbestätigung. Sie ist deine Vermieterin.',
          B1: 'Dann ab zum Bürgeramt! Aber hol dir vorher die Wohnungsgeberbestätigung bei Anna – sie ist ja deine Vermieterin.',
        },
        es: {
          A1: 'Ve al Bürgeramt. Pero primero: Anna te da la confirmación del casero. Ella es tu casera.',
          B1: '¡Pues al Bürgeramt! Pero antes pídele a Anna la confirmación del casero; al fin y al cabo es tu casera.',
        },
        vocab: ['wgb', 'vermieter', 'buergeramt'],
        action: 'quest:complete_shift',
      },
    },
  },
  boss_reminder: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: 'Und? Warst du schon beim Bürgeramt? Vergiss die Wohnungsgeberbestätigung von Anna nicht!',
        es: '¿Y bien? ¿Ya has ido al Bürgeramt? ¡No olvides la confirmación del casero de Anna!',
      },
    },
  },
  boss_proud: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'mehmet',
        de: 'Du bist angemeldet? Super! Jetzt bist du eine richtige Berlinerin – oder ein richtiger Berliner!',
        es: '¿Ya estás empadronado/a? ¡Genial! Ahora eres un/a berlinés/a de verdad.',
      },
    },
  },

  // Anna (casera) entrega la Wohnungsgeberbestätigung
  anna_wgb: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'anna',
        de: { A1: 'Hallo {name}! Brauchst du etwas?', B1: 'Hey {name}! Na, kann ich dir helfen?' },
        es: { A1: '¡Hola {name}! ¿Necesitas algo?', B1: '¡Hola {name}! ¿Qué tal? ¿Te puedo ayudar?' },
        choices: [
          { de: 'Ja, ich brauche die Wohnungsgeberbestätigung.', es: 'Sí, necesito la confirmación del casero.', correct: true, next: 'b', vocab: ['brauchen'] },
          { de: 'Ja, ich brauche ein Bier.', es: 'Sí, necesito una cerveza.', correct: false, feedback: 'Para el Bürgeramt necesitas la «Wohnungsgeberbestätigung», no una cerveza 😉.' },
          { de: 'Nein, danke.', es: 'No, gracias.' },
        ],
      },
      b: {
        speaker: 'anna',
        de: {
          A1: 'Ah, für die Anmeldung! Hier ist sie. Ich habe sie schon unterschrieben.',
          B1: 'Ach, für die Anmeldung, klar! Hier, bitte – ich habe sie schon unterschrieben. Viel Glück beim Amt!',
        },
        es: {
          A1: '¡Ah, para el empadronamiento! Aquí está. Ya la he firmado.',
          B1: '¡Ah, para el empadronamiento, claro! Toma, ya la he firmado. ¡Suerte en la oficina!',
        },
        vocab: ['unterschreiben'],
        action: 'give_wgb',
        choices: [{ de: 'Vielen Dank, Anna!', es: '¡Muchas gracias, Anna!', vocab: ['vielen_dank'] }],
      },
    },
  },

  // Recepción del Bürgeramt
  amt_empfang: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'empfang',
        de: { A1: 'Guten Morgen! Was kann ich für Sie tun?', B1: 'Guten Morgen! Womit kann ich Ihnen helfen?', B2: 'Morgen. Worum geht’s?' },
        es: { A1: '¡Buenos días! ¿En qué puedo ayudarle?', B1: '¡Buenos días! ¿En qué puedo ayudarle?', B2: 'Buenas. ¿De qué se trata?' },
        choices: [
          { de: 'Guten Morgen. Ich möchte mich anmelden.', es: 'Buenos días. Quiero empadronarme.', correct: true, next: 'b', vocab: ['sich_anmelden'] },
          { de: 'Guten Morgen. Ich möchte mich abmelden.', es: 'Buenos días. Quiero darme de baja.', correct: false, feedback: '«abmelden» = darse de baja. Tú quieres «anmelden» (darte de alta).' },
          { de: 'Hallo. Anmeldung du.', es: 'Hola. Empadronamiento tú.', correct: false, feedback: 'En una oficina se habla de «Sie» y con frase completa: «Ich möchte mich anmelden.»' },
        ],
      },
      b: {
        speaker: 'empfang',
        de: { A1: 'Haben Sie einen Termin?', B1: 'Haben Sie einen Termin gebucht?' },
        es: { A1: '¿Tiene cita?', B1: '¿Ha reservado cita?' },
        vocab: ['termin'],
        choices: [
          { de: 'Ja, um halb zehn.', es: 'Sí, a las nueve y media.', correct: true, next: 'c', feedback: '«halb zehn» = 9:30 (media hora ANTES de las diez).' },
          { de: 'Ja, ich bin Termin.', es: 'Sí, soy cita.', correct: false, feedback: 'Tener cita = «einen Termin haben»: «Ja, ich habe einen Termin.»' },
        ],
      },
      c: {
        speaker: 'empfang',
        de: {
          A1: 'Gut. Hier ist Ihre Wartenummer: B 127. Die Formulare sind links. Der Wartebereich ist geradeaus.',
          B1: 'Prima. Hier ist Ihre Wartenummer, B 127. Das Anmeldeformular finden Sie links am Ständer, der Wartebereich ist geradeaus.',
          B2: 'Gut, hier Ihre Nummer: B 127. Formulare links am Ständer, ausfüllen und dann im Wartebereich geradeaus Platz nehmen.',
        },
        es: {
          A1: 'Bien. Aquí tiene su número: B-127. Los formularios están a la izquierda. La sala de espera está todo recto.',
          B1: 'Estupendo. Aquí tiene su número, B-127. El formulario está a la izquierda, en el expositor; la sala de espera, todo recto.',
          B2: 'Bien, su número: B-127. Formularios a la izquierda en el expositor: rellénelo y luego siéntese en la sala de espera, todo recto.',
        },
        vocab: ['wartenummer', 'links', 'geradeaus', 'formular'],
        action: 'get_ticket',
      },
    },
  },
  amt_empfang_wait: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'empfang',
        de: 'Bitte füllen Sie das Formular aus und warten Sie, bis Ihre Nummer aufgerufen wird.',
        es: 'Rellene el formulario y espere a que llamen a su número.',
        vocab: ['ausfuellen', 'aufrufen'],
      },
    },
  },

  // Funcionaria en el puesto: saludo y motivo
  amt_desk: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'yilmaz',
        de: { A1: 'Guten Tag. Nehmen Sie Platz. Was kann ich für Sie tun?', B1: 'Guten Tag, bitte setzen Sie sich. Worum geht es?', B2: 'Tag. Setzen Sie sich. Anmeldung, Ummeldung oder Abmeldung?' },
        es: { A1: 'Buenos días. Siéntese. ¿En qué puedo ayudarle?', B1: 'Buenos días, siéntese, por favor. ¿De qué se trata?', B2: 'Buenas. Siéntese. ¿Alta, cambio de domicilio o baja?' },
        choices: [
          { de: 'Guten Tag. Ich möchte mich anmelden. Ich bin neu in Berlin.', es: 'Buenos días. Quiero empadronarme. Soy nuevo/a en Berlín.', correct: true, next: 'b' },
          { de: 'Guten Tag. Ich möchte mich ummelden.', es: 'Buenos días. Quiero cambiar mi domicilio.', correct: false, feedback: '«ummelden» es cambiar de domicilio dentro de Alemania. Tú llegas nuevo/a: «anmelden».' },
        ],
      },
      b: {
        speaker: 'yilmaz',
        de: { A1: 'Gut. Ich brauche Ihre Dokumente.', B1: 'In Ordnung. Dann bräuchte ich jetzt Ihre Unterlagen.' },
        es: { A1: 'Bien. Necesito sus documentos.', B1: 'De acuerdo. Entonces necesitaría ahora su documentación.' },
        vocab: ['ausweis', 'reisepass'],
        action: 'start_docs',
      },
    },
  },

  // Preguntas frecuentes tras los documentos
  amt_questions: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'yilmaz',
        de: { A1: 'Wie heißen Sie?', B1: 'Wie ist Ihr vollständiger Name, bitte?' },
        es: { A1: '¿Cómo se llama?', B1: '¿Cuál es su nombre completo, por favor?' },
        choices: [
          { de: 'Ich heiße {name} Ruiz.', es: 'Me llamo {name} Ruiz.', correct: true, next: 'b', vocab: ['vorname', 'nachname'] },
          { de: 'Ich bin {name} Ruiz alt.', es: 'Tengo {name} Ruiz años.', correct: false, feedback: '«alt» se usa para la edad. Para el nombre: «Ich heiße …» o «Mein Name ist …».' },
        ],
      },
      b: {
        speaker: 'yilmaz',
        de: { A1: 'Wo wohnen Sie?', B1: 'Und wie lautet Ihre neue Adresse?', B2: 'Ihre neue Anschrift in Berlin?' },
        es: { A1: '¿Dónde vive?', B1: '¿Y cuál es su nueva dirección?', B2: '¿Su nueva dirección en Berlín?' },
        vocab: ['adresse'],
        choices: [
          { de: 'Ich wohne in der Oranienstraße 25.', es: 'Vivo en la Oranienstraße 25.', correct: true, next: 'c', feedback: '«in der …straße»: las calles son femeninas (die Straße → in der).', vocab: ['strasse'] },
          { de: 'Ich wohne auf Oranienstraße 25.', es: '—', correct: false, feedback: 'Con calles se usa «in der»: «Ich wohne in der Oranienstraße 25.»' },
        ],
      },
      c: {
        speaker: 'yilmaz',
        de: { A1: 'Wann sind Sie eingezogen?', B1: 'Seit wann wohnen Sie dort? Also, wann sind Sie eingezogen?' },
        es: { A1: '¿Cuándo se mudó?', B1: '¿Desde cuándo vive allí? Es decir, ¿cuándo se mudó?' },
        vocab: ['einziehen'],
        choices: [
          { de: 'Am ersten Oktober.', es: 'El uno de octubre.', correct: true, next: 'd', feedback: 'Fechas: «am» + ordinal con -en: am ersten, am zweiten…' },
          { de: 'Am eins Oktober.', es: '—', correct: false, feedback: 'Las fechas usan ordinales: no «eins» sino «ersten» → «am ersten Oktober».' },
          { de: 'Ich habe am ersten Oktober eingezogen.', es: '—', correct: false, feedback: '«einziehen» indica cambio de lugar → Perfekt con «sein»: «Ich bin … eingezogen».' },
        ],
      },
      d: {
        speaker: 'yilmaz',
        de: { A1: 'Sind Sie verheiratet?', B1: 'Wie ist Ihr Familienstand?' },
        es: { A1: '¿Está casado/a?', B1: '¿Cuál es su estado civil?' },
        vocab: ['familienstand', 'verheiratet'],
        choices: [
          { de: 'Nein, ich bin ledig.', es: 'No, estoy soltero/a.', correct: true, next: 'e', vocab: ['ledig'] },
          { de: 'Nein, ich bin leider.', es: '—', correct: false, feedback: '«leider» = desgraciadamente 😅. Soltero/a = «ledig».' },
        ],
      },
      e: {
        speaker: 'yilmaz',
        de: { A1: 'Danke. Bitte prüfen Sie die Daten und unterschreiben Sie hier.', B1: 'Vielen Dank. Bitte prüfen Sie alle Angaben und unterschreiben Sie dann hier unten.' },
        es: { A1: 'Gracias. Por favor, revise los datos y firme aquí.', B1: 'Muchas gracias. Revise todos los datos y luego firme aquí abajo.' },
        vocab: ['pruefen', 'unterschreiben'],
        action: 'ready_to_sign',
      },
    },
  },
  amt_done: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'yilmaz',
        de: {
          A1: 'Fertig! Hier ist Ihre Anmeldebestätigung. Die Steuer-ID kommt per Post. Auf Wiedersehen!',
          B1: 'So, fertig! Hier ist Ihre Anmeldebestätigung. Ihre Steuer-ID bekommen Sie in zwei bis vier Wochen per Post.',
        },
        es: {
          A1: '¡Listo! Aquí tiene su certificado de empadronamiento. El número fiscal llega por correo. ¡Adiós!',
          B1: '¡Listo! Aquí tiene su certificado de empadronamiento. Su número fiscal le llegará por correo en dos a cuatro semanas.',
        },
        vocab: ['steuer_id', 'per_post', 'anmeldebestaetigung_v'],
        choices: [
          { de: 'Vielen Dank! Auf Wiedersehen!', es: '¡Muchas gracias! ¡Adiós!', vocab: ['auf_wiedersehen'], action: 'quest:complete_anmeldung' },
          { de: 'Tschüss!', es: '¡Chao!', feedback: '«Tschüss» es informal; en una oficina suena mejor «Auf Wiedersehen».', action: 'quest:complete_anmeldung' },
        ],
      },
    },
  },
  amt_not_your_turn: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'official',
        de: 'Sie sind noch nicht dran. Bitte warten Sie, bis Ihre Nummer auf dem Bildschirm erscheint.',
        es: 'Todavía no es su turno. Espere a que su número aparezca en la pantalla.',
        vocab: ['bildschirm'],
      },
    },
  },
  amt_wrong_desk: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'official',
        de: 'Nummer B 127? Nein, Sie sind nicht bei mir. Schauen Sie auf den Bildschirm: Welcher Platz?',
        es: '¿Número B-127? No, no le toca conmigo. Mire la pantalla: ¿qué puesto?',
        vocab: ['platz'],
      },
    },
  },
  amt_closed_desk: {
    start: 'a',
    nodes: {
      a: {
        speaker: 'official',
        de: 'Moment, bitte. Ich habe gerade einen Kunden.',
        es: 'Un momento, por favor. Ahora estoy atendiendo a alguien.',
      },
    },
  },
};
