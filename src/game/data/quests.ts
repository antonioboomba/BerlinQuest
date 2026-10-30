// Cadena de misiones del juego Phaser. Cada misión define sus pasos (con el objetivo que ve el
// jugador) y su recompensa. Al completarse una misión empieza automáticamente la siguiente.

export type QuestId = 'shift' | 'anmeldung';

export interface QuestStepDef {
  id: string;
  /** texto corto para la lista de pasos */
  label: string;
  /** objetivo detallado del panel (admite {served} y {desk}) */
  objective: string;
  icon: string;
}

export interface QuestDef {
  id: QuestId;
  code: string;
  title: string;
  /** frase de cierre en el aviso de misión completada */
  outro: string;
  steps: QuestStepDef[];
  reward: { xp: number; money: number; items?: string[] };
}

export const QUEST_SERVE_TARGET = 3;
export const QUEST_PAY = 30;

export const QUESTS: QuestDef[] = [
  {
    id: 'shift',
    code: 'Mission 01',
    title: 'Tu primer turno',
    outro: 'Has sobrevivido a tu primer turno en el «Kater Karlo».',
    steps: [
      { id: 'go_bar', label: 'Ve al bar «Kater Karlo»', objective: 'Ve al bar.', icon: '🍺' },
      { id: 'talk_boss', label: 'Habla con el jefe', objective: 'Habla con el jefe (Mehmet).', icon: '💬' },
      { id: 'serve', label: `Sirve ${QUEST_SERVE_TARGET} bebidas a los clientes`, objective: 'Sirve la bebida correcta al cliente. ({served}/3)', icon: '🍺' },
      { id: 'get_paid', label: `Cobra tu sueldo (${QUEST_PAY} €)`, objective: 'Habla con Mehmet para cobrar.', icon: '💶' },
    ],
    reward: { xp: 50, money: QUEST_PAY },
  },
  {
    id: 'anmeldung',
    code: 'Mission 02',
    title: 'Dein Anmeldung-Termin',
    outro: '¡Ya estás empadronado/a en Berlín! Tu Steuer-ID llegará por correo.',
    steps: [
      { id: 'get_wgb', label: 'Pide a Anna la Wohnungsgeberbestätigung', objective: 'Busca a Anna (tu casera) en la calle y pídele la Wohnungsgeberbestätigung.', icon: '📄' },
      { id: 'go_amt', label: 'Ve al Bürgeramt', objective: 'Entra en el Bürgeramt (edificio beige con bandera).', icon: '🏛️' },
      { id: 'ticket', label: 'Saca tu número en la recepción', objective: 'Habla con la recepción (Empfang) para sacar tu número.', icon: '🎫' },
      { id: 'form', label: 'Rellena el Anmeldeformular', objective: 'Coge un formulario del expositor y rellénalo en el atril.', icon: '📝' },
      { id: 'wait', label: 'Espera tu turno sentado', objective: 'Siéntate en la sala de espera y atento a la pantalla.', icon: '🪑' },
      { id: 'desk', label: 'Ve al puesto que te llamen', objective: '¡Te llaman! Ve al Platz {desk} y habla con la funcionaria.', icon: '📢' },
      { id: 'docs', label: 'Entrega tus documentos', objective: 'Entrega los documentos que te pide la funcionaria.', icon: '🗂️' },
      { id: 'questions', label: 'Responde a sus preguntas', objective: 'Responde a las preguntas de la funcionaria.', icon: '💬' },
      { id: 'sign', label: 'Firma y recoge la Anmeldebestätigung', objective: 'Firma en el puesto (pulsa E en la mesa).', icon: '✍️' },
    ],
    reward: { xp: 120, money: 0, items: ['anmeldebestaetigung'] },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

// ───────────── Datos personales del jugador para el formulario ─────────────

export const PROFILE = {
  nachname: 'Ruiz',
  geburtsdatum: '12.03.1998',
  strasse: 'Oranienstraße 25',
  plz: '10999 Berlin',
  einzug: '01.10.2026',
  staatsangehoerigkeit: 'spanisch',
  familienstand: 'ledig',
};

export interface FormField {
  label: string;
  es: string;
  options: string[];
  correct: number;
  explain: string;
  vocab?: string[];
}

/** Anmeldeformular: el jugador elige qué dato va en cada casilla. */
export function anmeldeFormular(vorname: string): FormField[] {
  const p = PROFILE;
  return [
    { label: 'Familienname', es: 'Apellido', options: [vorname, p.nachname, 'Berlin'], correct: 1, explain: '«Familienname» = apellido. «Vorname» = nombre de pila.', vocab: ['nachname'] },
    { label: 'Vorname', es: 'Nombre de pila', options: [p.nachname, 'Herr', vorname], correct: 2, explain: '«Vorname» es el nombre de pila.', vocab: ['vorname'] },
    { label: 'Geburtsdatum', es: 'Fecha de nacimiento', options: [p.einzug, p.geburtsdatum, p.plz], correct: 1, explain: '«Geburtsdatum» = fecha de nacimiento (Geburt = nacimiento).', vocab: ['geburtsdatum'] },
    { label: 'Straße und Hausnummer', es: 'Calle y número', options: [p.strasse, p.plz, p.staatsangehoerigkeit], correct: 0, explain: '«Straße» = calle, «Hausnummer» = número del portal.', vocab: ['strasse', 'hausnummer'] },
    { label: 'Postleitzahl und Ort', es: 'Código postal y ciudad', options: [p.geburtsdatum, p.plz, p.strasse], correct: 1, explain: '«Postleitzahl» (PLZ) = código postal. «Ort» = localidad.', vocab: ['postleitzahl'] },
    { label: 'Einzugsdatum', es: 'Fecha de mudanza', options: [p.geburtsdatum, p.einzug, '–'], correct: 1, explain: '«Einzugsdatum»: el día en que te mudaste (einziehen = mudarse).', vocab: ['einziehen'] },
    { label: 'Staatsangehörigkeit', es: 'Nacionalidad', options: ['ledig', 'Spanien', p.staatsangehoerigkeit], correct: 2, explain: 'Se responde con el adjetivo: «spanisch», «mexikanisch», «deutsch».', vocab: ['staatsangehoerigkeit'] },
    { label: 'Familienstand', es: 'Estado civil', options: [p.familienstand, p.staatsangehoerigkeit, 'evangelisch'], correct: 0, explain: '«ledig» = soltero/a; «verheiratet» = casado/a.', vocab: ['familienstand', 'ledig'] },
  ];
}

/** Documentos que pide la funcionaria, en orden. */
export const DOC_REQUESTS: { item: string; de: string; es: string; wrong: string }[] = [
  { item: 'reisepass', de: 'Ihren Ausweis oder Reisepass, bitte.', es: 'Su DNI o pasaporte, por favor.', wrong: 'Das ist nicht Ihr Ausweis. Ich brauche Ihren Reisepass.' },
  { item: 'wgb', de: 'Und die Wohnungsgeberbestätigung von Ihrer Vermieterin?', es: '¿Y la confirmación de su casera?', wrong: 'Nein, ich meine die Wohnungsgeberbestätigung – das Formular von der Vermieterin.' },
  { item: 'anmeldeformular', de: 'Haben Sie das Anmeldeformular ausgefüllt?', es: '¿Ha rellenado el formulario de empadronamiento?', wrong: 'Das ist nicht das Formular. Ich brauche das ausgefüllte Anmeldeformular.' },
];
