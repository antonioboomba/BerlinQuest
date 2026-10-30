import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { ChoicePanel, ClozePanel, FreePanel, SpellPanel } from '../components/mission/Interactions';
import { MissionEnd, type MissionResult } from '../components/mission/MissionEnd';
import { TranscriptEntry, type Entry } from '../components/mission/Transcript';
import { Button, Modal } from '../components/ui';
import { ITEMS } from '../data/items';
import { MISSIONS } from '../data/missions';
import { applySessionEffects, checkCondition, formatEuro, resolveDyn, resolveText, type MissionSession } from '../engine/dialogue';
import { checkCloze, evaluateSpelling, letterName } from '../engine/evaluate';
import { getNpcProvider } from '../engine/npc/provider';
import { answerXp } from '../engine/progression';
import type { DialogueContext, DialogueNode, Effects, EndNode, Skill } from '../engine/types';
import { useGame } from '../GameContext';
import type { Tab } from './GameShell';

/** Nodos que requieren una acción del jugador (o "Continuar"). */
type StopNode = Exclude<DialogueNode, { kind: 'branch' } | { kind: 'end' }>;

export function MissionScreen({ missionId, onExit }: { missionId: string; onExit: (tab?: Tab) => void }) {
  const { state, dispatch } = useGame();
  const mission = MISSIONS[missionId];
  const player = state.player!;
  const level = state.settings.level;
  const provider = getNpcProvider();

  const sessionRef = useRef<MissionSession>({
    money: state.money,
    inventory: state.inventory,
    flags: { ...state.flags },
    objectives: [],
    journal: [],
    vocab: [],
  });
  const [session, setSession] = useState(sessionRef.current);
  const [transcript, setTranscript] = useState<Entry[]>([]);
  const [current, setCurrent] = useState<StopNode | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [wrongPicked, setWrongPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [translations, setTranslations] = useState(state.settings.translations);
  const score = useRef({ correct: 0, graded: 0, xp: 0 });
  const started = useRef(false);
  const finished = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ctx = (): DialogueContext => {
    const s = sessionRef.current;
    return { player, level, flags: s.flags, inventory: s.inventory, money: s.money };
  };
  const push = (...entries: Entry[]) => setTranscript((t) => [...t, ...entries]);

  const applyEffects = (e?: Effects) => {
    if (!e) return;
    sessionRef.current = applySessionEffects(sessionRef.current, e);
    setSession(sessionRef.current);
    if (e.learnVocab?.length) dispatch({ type: 'LEARN_VOCAB', ids: e.learnVocab });
  };

  const learn = (ids?: string[]) => {
    if (!ids?.length) return;
    const fresh = ids.filter((id) => !sessionRef.current.vocab.includes(id));
    applyEffects({ learnVocab: ids });
    if (fresh.length) push({ kind: 'vocab', ids: fresh });
  };

  const record = (skill: Skill, correct: boolean, xp: number) => {
    score.current.graded += 1;
    if (correct) score.current.correct += 1;
    score.current.xp += xp;
    dispatch({ type: 'RECORD_ANSWER', skill, correct, xp });
  };

  const finish = (node: EndNode) => {
    if (finished.current) return;
    finished.current = true;
    applyEffects(node.effects);
    const s = sessionRef.current;
    const { correct, graded } = score.current;
    const acc = graded ? correct / graded : 1;
    let stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    if (s.flags.cameBack) stars = Math.min(stars, 2);
    const firstClear = !state.missions[mission.id]?.completed;
    const endXp = firstClear ? node.xp : Math.round(node.xp * 0.25);
    dispatch({
      type: 'FINISH_MISSION',
      missionId: mission.id,
      session: s,
      outcome: node.outcome,
      stars,
      xp: node.xp,
      transientItems: mission.transientItems ?? [],
    });
    setCurrent(null);
    setResult({
      node,
      summary: resolveDyn(node.summary, ctx()),
      stars,
      accuracy: acc,
      answerXp: score.current.xp,
      endXp,
      moneyDelta: s.money - state.money,
      newItems: s.inventory.filter((i) => !state.inventory.includes(i) && !(mission.transientItems ?? []).includes(i)),
      words: s.vocab.length,
      objectives: s.objectives,
    });
  };

  /** Avanza por el grafo hasta el siguiente nodo que requiera interacción. */
  const enter = (id: string) => {
    let nodeId: string | undefined = id;
    for (let guard = 0; nodeId && guard < 50; guard++) {
      const node: DialogueNode | undefined = mission.nodes[nodeId];
      if (!node) {
        console.error(`Nodo no encontrado: ${nodeId}`);
        return;
      }
      if (node.kind === 'branch') {
        const c = ctx();
        nodeId = node.branches.find((b) => checkCondition(b.if, c))?.next ?? node.else;
        continue;
      }
      if (node.kind === 'end') return finish(node);

      if (node.kind === 'npc') push({ kind: 'npc', speaker: node.speaker, de: resolveText(node.de, ctx()), es: resolveText(node.es, ctx()), note: node.note });
      if (node.kind === 'narration') push({ kind: 'narration', es: resolveDyn(node.es, ctx()) });
      learn(node.vocab);
      // Los efectos de los nodos de diálogo se aplican al entrar; los de las respuestas, al responder.
      applyEffects(node.effects);
      setAttempts(0);
      setWrongPicked(new Set());
      setCurrent(node);
      return;
    }
  };

  // Inicio de la misión (protegido frente al doble montaje de StrictMode).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    enter(mission.start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript, current]);

  // ───────────── Respuestas ─────────────

  const onContinue = () => {
    if (current?.kind === 'npc' || current?.kind === 'narration') enter(current.next);
  };

  const onChoice = (i: number) => {
    if (current?.kind !== 'choice') return;
    const options = current.options.filter((o) => !o.requires || checkCondition(o.requires, ctx()));
    const o = options[i];
    push({ kind: 'player', de: o.de, wrong: o.correct === false && !o.next });

    if (o.correct === undefined) {
      if (o.feedback) push({ kind: 'feedback', tone: 'info', title: o.feedback });
    } else if (o.correct) {
      record(current.skill, true, answerXp(level, attempts === 0));
      push({ kind: 'feedback', tone: 'good', title: attempts === 0 ? '¡Correcto!' : 'Ahora sí', text: o.feedback });
    } else {
      record(current.skill, false, 0);
      push({ kind: 'feedback', tone: o.next ? 'warn' : 'bad', title: o.next ? 'Hmm…' : 'No exactamente', text: o.feedback });
      if (!o.next) {
        setAttempts((a) => a + 1);
        setWrongPicked((w) => new Set(w).add(i));
        return;
      }
    }
    applyEffects(o.effects);
    if (o.next) enter(o.next);
  };

  const onCloze = (answer: string) => {
    if (current?.kind !== 'cloze') return;
    const v = checkCloze(answer, current.answers, current.wrong);
    const sentence = `${current.before} ${answer.trim()} ${current.after}`.replace(/\s+([.,!?])/g, '$1');
    if (v.status === 'correct' || v.status === 'typo') {
      record(current.skill, true, answerXp(level, attempts === 0));
      push(
        { kind: 'player', de: sentence },
        {
          kind: 'feedback',
          tone: v.status === 'typo' || v.note ? 'warn' : 'good',
          title: v.status === 'typo' ? v.note : attempts === 0 ? '¡Correcto!' : 'Ahora sí',
          text: [v.status === 'correct' ? v.note : undefined, current.explanation].filter(Boolean).join(' '),
        },
      );
      return enter(current.next);
    }
    record(current.skill, false, 0);
    push({ kind: 'player', de: sentence, wrong: true });
    if (attempts >= 1) {
      push({
        kind: 'feedback',
        tone: 'bad',
        title: `La respuesta era «${current.answers[0]}»`,
        text: [v.feedback, current.explanation].filter(Boolean).join(' '),
      });
      push({ kind: 'player', de: `${current.before} ${current.answers[0]} ${current.after}`.replace(/\s+([.,!?])/g, '$1') });
      return enter(current.next);
    }
    push({ kind: 'feedback', tone: 'bad', title: 'Inténtalo otra vez', text: v.feedback ?? `Pista: ${current.hint}` });
    setAttempts((a) => a + 1);
  };

  const onFree = async (text: string) => {
    if (current?.kind !== 'free') return;
    const node = current;
    setBusy(true);
    push({ kind: 'player', de: text });
    const c = ctx();
    const res = await provider.respond(node, text, c, attempts);
    setBusy(false);
    push({ kind: 'npc', speaker: res.reply.speaker, de: res.reply.de, es: res.reply.es });

    const { evaluation: ev } = res;
    if (res.askAgain) {
      push({
        kind: 'feedback',
        tone: 'warn',
        title: 'No te ha entendido del todo',
        items: ev.missing.map((r) => ({ label: resolveDyn(r.message, c) })),
      });
      setAttempts((a) => a + 1);
      return;
    }

    const clean = ev.understood && ev.mistakes.length === 0;
    const xp = ev.understood ? Math.max(5, answerXp(level, attempts === 0, 20) - ev.mistakes.length * 4) : 3;
    record(node.skill, clean, xp);
    const items = [
      ...ev.missing.map((r) => ({ label: resolveDyn(r.message, c) })),
      ...ev.mistakes.map((r) => ({ label: resolveDyn(r.message, c), fix: r.fix ? resolveDyn(r.fix, c) : undefined })),
      ...ev.tips.map((r) => ({ label: resolveDyn(r.message, c) })),
    ];
    push({
      kind: 'feedback',
      tone: clean ? 'good' : 'warn',
      title: clean ? (items.length ? '¡Muy bien! Un consejo:' : '¡Muy bien dicho!') : `Te han entendido · ${ev.mistakes.length + ev.missing.length} cosa${ev.mistakes.length + ev.missing.length === 1 ? '' : 's'} por pulir`,
      items,
      model: ev.closestModel,
      // la corrección no interrumpe: queda plegada salvo que haya errores
      collapsed: clean,
    });
    enter(node.next);
  };

  const onSpell = (text: string) => {
    if (current?.kind !== 'spell') return;
    const word = resolveDyn(current.word, ctx());
    const r = evaluateSpelling(word, text);
    push({ kind: 'player', de: text });
    const wrong = r.letters.filter((l) => !l.ok);
    const passed = r.score >= 0.8;

    if (!passed && attempts === 0) {
      record(current.skill, false, 0);
      push(
        { kind: 'npc', speaker: current.npcReply.speaker, de: 'Wie bitte? Noch einmal, bitte – langsam.', es: '¿Cómo? Otra vez, por favor, despacio.' },
        {
          kind: 'feedback',
          tone: 'bad',
          title: `${wrong.length} letra${wrong.length === 1 ? '' : 's'} por corregir`,
          items: wrong.map((l) => ({ label: `${l.letter.toUpperCase()}: escribiste «${l.given || '—'}»`, fix: letterName(l.letter) })),
          text: 'Usa el botón «Ver alfabeto» si lo necesitas.',
        },
      );
      setAttempts(1);
      return;
    }

    record(current.skill, passed, passed ? answerXp(level, attempts === 0, 20) : 3);
    if (r.score === 1) applyEffects({ setFlags: { spelledPerfect: true } });
    push(
      { kind: 'npc', speaker: current.npcReply.speaker, de: current.npcReply.de, es: current.npcReply.es },
      wrong.length
        ? {
            kind: 'feedback',
            tone: 'warn',
            title: 'Casi perfecto. Repasa estas letras:',
            items: wrong.map((l) => ({ label: l.letter.toUpperCase(), fix: letterName(l.letter) })),
          }
        : { kind: 'feedback', tone: 'good', title: 'Deletreo perfecto 🔤', text: 'Esto te servirá cada vez que llames por teléfono a una oficina alemana.' },
    );
    enter(current.next);
  };

  const quit = useCallback(() => onExit('map'), [onExit]);
  const visibleOptions = current?.kind === 'choice' ? current.options.filter((o) => !o.requires || checkCondition(o.requires, ctx())) : [];
  const required = mission.objectives.filter((o) => !o.optional);
  const translationCycle = { always: 'tap', tap: 'never', never: 'always' } as const;
  const doneRequired = session.objectives.filter((o) => required.some((r) => r.id === o)).length;

  const sidePanel = (
    <>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted">
            Objetivos · {doneRequired}/{required.length}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {mission.objectives.map((o) => {
              const done = session.objectives.includes(o.id);
              return (
                <li key={o.id} className={`flex gap-2 ${done ? 'text-acid' : o.optional ? 'text-white/45' : 'text-white/80'}`}>
                  <span>{done ? '✔' : o.optional ? '◇' : '○'}</span>
                  <span className={done ? 'line-through decoration-acid/50' : ''}>{o.text}</span>
                </li>
              );
            })}
          </ul>
          <h2 className="mb-2 mt-6 font-mono text-xs uppercase tracking-wider text-muted">Mochila</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {session.inventory.map((id) => {
              const it = ITEMS[id];
              return (
                <div key={id} title={`${it?.name} — ${it?.de}`} className="flex aspect-square items-center justify-center rounded-lg border border-line bg-panel2 text-xl">
                  {it?.emoji ?? '❔'}
                </div>
              );
            })}
          </div>
          <h2 className="mb-2 mt-6 font-mono text-xs uppercase tracking-wider text-muted">Esta misión</h2>
          <p className="text-sm text-white/75">📚 {session.vocab.length} palabras nuevas</p>
          <p className="text-sm text-white/75">⭐ {score.current.xp} XP por respuestas</p>
    </>
  );

  return (
    <div className="mx-auto flex h-[100dvh] max-w-6xl flex-col">
      {/* Cabecera de misión */}
      <header className="flex items-center gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur">
        <button onClick={() => (result ? quit() : setConfirmQuit(true))} className="rounded-lg px-2 py-1 text-muted hover:bg-white/5 hover:text-white" aria-label="Salir de la misión">
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-violet">{mission.subtitle}</p>
          <h1 className="truncate font-display font-bold">{mission.title}</h1>
        </div>
        <button onClick={() => setPanelOpen(true)} className="rounded-lg border border-line px-2 py-1 font-mono text-xs text-acid lg:hidden" aria-label="Objetivos y mochila">
          🎯 {doneRequired}/{required.length}
        </button>
        <button
          onClick={() => setTranslations((t) => translationCycle[t])}
          className="rounded-lg border border-line px-2 py-1 font-mono text-xs text-muted hover:text-white"
          title="Traducciones: siempre / al pulsar / nunca"
        >
          ES: {translations === 'always' ? 'on' : translations === 'tap' ? 'tap' : 'off'}
        </button>
        <span className="font-mono text-sm text-amber-200">{formatEuro(session.money)}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Transcripción */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {transcript.map((e, i) => (
                <TranscriptEntry key={i} e={e} npcs={mission.npcs} translations={translations} playerAvatar={<Avatar a={player.appearance} size={30} />} />
              ))}
              {result && <MissionEnd result={result} onMap={() => onExit('map')} onVocab={() => onExit('vocab')} objectivesDef={mission.objectives} />}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Panel de interacción */}
          {current && (
            <div className="border-t border-line bg-panel/95 px-4 py-4 backdrop-blur" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <div className="mx-auto max-w-2xl">
                {(current.kind === 'npc' || current.kind === 'narration') && (
                  <Button variant="primary" className="w-full py-3" onClick={onContinue} autoFocus>
                    Continuar ▸
                  </Button>
                )}
                {current.kind === 'choice' && (
                  <>
                    <p className="mb-3 text-sm text-white/85">{resolveDyn(current.prompt, ctx())}</p>
                    <ChoicePanel options={visibleOptions} disabled={wrongPicked} showEs={translations === 'always'} onPick={onChoice} />
                  </>
                )}
                {current.kind === 'cloze' && (
                  <>
                    <p className="mb-3 text-sm text-white/85">{current.prompt}</p>
                    <ClozePanel key={current.id} before={current.before} after={current.after} bank={current.bank} level={level} hint={current.hint} onSubmit={onCloze} />
                  </>
                )}
                {current.kind === 'free' && (
                  <>
                    <p className="mb-3 text-sm text-white/85">✍️ {resolveDyn(current.task, ctx())}</p>
                    <FreePanel key={current.id} placeholder={current.placeholder} busy={busy} onSubmit={onFree} />
                  </>
                )}
                {current.kind === 'spell' && (
                  <>
                    <p className="mb-3 text-sm text-white/85">🔤 {current.task}</p>
                    <SpellPanel key={current.id} word={resolveDyn(current.word, ctx())} onSubmit={onSpell} />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lateral: objetivos e inventario (escritorio) */}
        <aside className="scrollbar-thin hidden w-72 shrink-0 overflow-y-auto border-l border-line p-4 lg:block">
          {sidePanel}
        </aside>
      </div>

      <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title={mission.title}>
        {sidePanel}
      </Modal>

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} title="¿Abandonar la misión?">
        <p className="text-sm text-white/80">Perderás el avance de esta misión (dinero, objetos y decisiones). La XP de las respuestas y el vocabulario aprendido se conservan.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmQuit(false)}>
            Seguir jugando
          </Button>
          <Button variant="danger" className="flex-1" onClick={quit}>
            Salir al mapa
          </Button>
        </div>
      </Modal>
    </div>
  );
}
