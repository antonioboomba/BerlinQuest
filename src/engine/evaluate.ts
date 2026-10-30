import type { DialogueContext, FreeRule } from './types';

// ───────────────────────── Normalización ─────────────────────────

/** Minúsculas, sin puntuación, espacios colapsados. Conserva umlauts. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?¡¿;:"'«»()\-–—…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Transcripción de umlauts y ß (ä→ae, ß→ss) para aceptar teclados sin ellos. */
export function foldUmlauts(s: string): string {
  return s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

/** Quita tildes españolas (á→a, ñ→n) pero NO los umlauts alemanes. */
export function stripForeignAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/([aou])̈/gi, (_m, v: string) => ({ a: 'ä', o: 'ö', u: 'ü', A: 'Ä', O: 'Ö', U: 'Ü' })[v] ?? v)
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC');
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

// ───────────────────────── Huecos (cloze) ─────────────────────────

export type ClozeVerdict =
  | { status: 'correct'; note?: string }
  | { status: 'typo'; expected: string; note: string }
  | { status: 'wrong'; feedback?: string };

export function checkCloze(input: string, answers: string[], wrong?: Record<string, string>): ClozeVerdict {
  const raw = input.trim();
  const n = normalize(raw);
  if (!n) return { status: 'wrong' };

  for (const ans of answers) {
    const a = normalize(ans);
    if (n === a) {
      // Mayúsculas importan en alemán (sustantivos), pero solo lo señalamos.
      const casing = raw.replace(/[.!?]$/, '') !== ans && raw.toLowerCase() === ans.toLowerCase();
      return casing
        ? { status: 'correct', note: `Ojo con las mayúsculas: se escribe «${ans}».` }
        : { status: 'correct' };
    }
    if (foldUmlauts(n) === foldUmlauts(a)) {
      return { status: 'correct', note: `Aceptado. Con umlauts se escribe «${ans}» (ae = ä, oe = ö, ue = ü, ss = ß).` };
    }
  }

  const specific = wrong?.[n] ?? wrong?.[foldUmlauts(n)];
  if (specific) return { status: 'wrong', feedback: specific };

  for (const ans of answers) {
    const a = foldUmlauts(normalize(ans));
    const dist = levenshtein(foldUmlauts(n), a);
    if (a.length >= 4 && dist === 1) {
      return { status: 'typo', expected: ans, note: `¡Casi! Pequeña errata: se escribe «${ans}».` };
    }
  }
  return { status: 'wrong' };
}

// ───────────────────────── Escritura libre ─────────────────────────

export interface FreeEvaluation {
  /** El NPC entiende el mensaje (todos los requisitos cumplidos) */
  understood: boolean;
  /** 0..1 */
  score: number;
  missing: FreeRule[];
  mistakes: FreeRule[];
  tips: FreeRule[];
  /** Respuesta modelo más cercana a lo que escribió el jugador */
  closestModel: string;
}

export function evaluateFree(
  text: string,
  rules: FreeRule[],
  models: string[],
  ctx: DialogueContext,
): FreeEvaluation {
  // Las reglas se escriben sobre texto en minúsculas y con umlauts transcritos (ü → ue, ß → ss).
  const n = foldUmlauts(normalize(stripForeignAccents(text)));
  const requires = rules.filter((r) => r.kind === 'require');
  const missing = requires.filter((r) => !r.test(n, ctx));
  const mistakes = rules.filter((r) => r.kind === 'mistake' && r.test(n, ctx));
  const tips = rules.filter((r) => r.kind === 'tip' && r.test(n, ctx));

  const reqScore = requires.length ? (requires.length - missing.length) / requires.length : 1;
  const score = Math.max(0, reqScore - mistakes.length * 0.15);

  let closestModel = models[0] ?? '';
  let best = Infinity;
  for (const m of models) {
    const d = levenshtein(n, foldUmlauts(normalize(m)));
    if (d < best) {
      best = d;
      closestModel = m;
    }
  }

  return { understood: missing.length === 0, score, missing, mistakes, tips, closestModel };
}

/** Atajo para reglas: prueba una RegExp contra el texto normalizado. */
export const has = (re: RegExp) => (t: string) => re.test(t);

// ───────────────────────── Deletrear (Buchstabieren) ─────────────────────────

export const GERMAN_ALPHABET: Record<string, string[]> = {
  a: ['a'], b: ['be'], c: ['ce', 'ze', 'tse'], d: ['de'], e: ['e', 'ee'], f: ['ef'], g: ['ge'],
  h: ['ha'], i: ['i', 'ih'], j: ['jot', 'jott', 'yot'], k: ['ka'], l: ['el'], m: ['em'], n: ['en'],
  o: ['o'], p: ['pe'], q: ['ku', 'kuh', 'qu'], r: ['er'], s: ['es'], t: ['te'], u: ['u', 'uh'],
  v: ['fau', 'vau'], w: ['we', 've'], x: ['ix', 'iks'], y: ['ypsilon', 'üpsilon', 'upsilon'],
  z: ['zett', 'zet', 'tset'], ä: ['ä', 'ae', 'a umlaut'], ö: ['ö', 'oe', 'o umlaut'],
  ü: ['ü', 'ue', 'u umlaut'], ß: ['eszett', 'scharfes s', 'esszett'],
};

/** Nombre principal de cada letra para mostrar en la tabla y en las correcciones. */
export function letterName(ch: string): string {
  return GERMAN_ALPHABET[ch]?.[0] === 'ce' ? 'ce (tse)' : (GERMAN_ALPHABET[ch]?.[0] ?? ch);
}

export interface SpellResult {
  letters: { letter: string; given: string; ok: boolean }[];
  score: number;
}

export function evaluateSpelling(word: string, input: string): SpellResult {
  const target = stripForeignAccents(word.toLowerCase()).replace(/[^a-zäöüß]/g, '').split('');
  const tokens = input
    .toLowerCase()
    .replace(/a umlaut/g, 'ä').replace(/o umlaut/g, 'ö').replace(/u umlaut/g, 'ü')
    .replace(/scharfes s/g, 'eszett')
    .split(/[\s,;\-–./]+/)
    .filter(Boolean);

  const letters = target.map((letter, i) => {
    const given = tokens[i] ?? '';
    const ok = (GERMAN_ALPHABET[letter] ?? [letter]).includes(given);
    return { letter, given, ok };
  });
  const okCount = letters.filter((l) => l.ok).length;
  const extra = Math.max(0, tokens.length - target.length);
  const score = target.length ? Math.max(0, (okCount - extra) / target.length) : 0;
  return { letters, score };
}
