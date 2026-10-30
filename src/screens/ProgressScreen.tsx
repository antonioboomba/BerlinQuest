import { Avatar } from '../components/Avatar';
import { Panel, ProgressBar, Stars } from '../components/ui';
import { ACHIEVEMENTS } from '../data/achievements';
import { BACKGROUNDS } from '../data/backgrounds';
import { getCountry } from '../data/countries';
import { ITEMS } from '../data/items';
import { MISSIONS } from '../data/missions';
import { formatEuro } from '../engine/dialogue';
import { accuracy, levelFromXp, SKILL_LABELS, skillRank } from '../engine/progression';
import { mastery } from '../engine/srs';
import { SKILLS } from '../engine/types';
import { useGame } from '../GameContext';

const h2 = 'mb-3 font-mono text-xs uppercase tracking-wider text-muted';

export function ProgressScreen() {
  const { state } = useGame();
  const p = state.player!;
  const lvl = levelFromXp(state.xp);
  const country = getCountry(p.origin);
  const cards = Object.values(state.vocab);
  const mastered = cards.filter((c) => mastery(c) === 'mastered' || mastery(c) === 'known').length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Ficha */}
      <Panel className="flex flex-col items-center gap-2 p-5 text-center lg:row-span-2">
        <Avatar a={p.appearance} size={120} />
        <h1 className="font-display text-2xl font-black">
          {p.firstName} {p.lastName}
        </h1>
        <p className="text-sm text-muted">
          {country.flag} aus {country.de} · {BACKGROUNDS[p.background].de}
        </p>
        <div className="mt-2 w-full">
          <div className="flex justify-between text-sm">
            <span>Nivel {lvl.level}</span>
            <span className="font-mono text-muted">
              {lvl.into}/{lvl.needed} XP
            </span>
          </div>
          <ProgressBar value={lvl.into / lvl.needed} className="mt-1" />
        </div>
        <div className="mt-3 grid w-full grid-cols-3 gap-2 text-left">
          <MiniStat label="XP total" value={String(state.xp)} />
          <MiniStat label="Dinero" value={formatEuro(state.money)} />
          <MiniStat label="Alemán" value={state.settings.level} />
          <MiniStat label="Palabras" value={String(cards.length)} />
          <MiniStat label="Afianzadas" value={String(mastered)} />
          <MiniStat label="Precisión" value={`${Math.round(accuracy(state.stats.correctAnswers, state.stats.answers) * 100)} %`} />
        </div>

        <h2 className={`${h2} mt-5 self-start`}>Inventario</h2>
        <div className="grid w-full grid-cols-2 gap-2 text-left">
          {state.inventory.map((id) => {
            const it = ITEMS[id];
            if (!it) return null;
            return (
              <div key={id} className="rounded-xl border border-line bg-panel2 p-2.5" title={it.description}>
                <p className="text-xl">{it.emoji}</p>
                <p className="text-sm font-semibold">{it.name}</p>
                <p className="text-xs text-muted" lang="de">
                  {it.de}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Habilidades */}
      <Panel className="p-5 lg:col-span-2">
        <h2 className={h2}>Habilidades · Fertigkeiten</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SKILLS.map((s) => {
            const st = state.skills[s];
            const rank = skillRank(st.xp);
            const nextXp = 20 * (rank + 1) ** 2;
            const prevXp = 20 * rank ** 2;
            return (
              <div key={s} className="rounded-xl border border-line bg-ink/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {SKILL_LABELS[s].emoji} {SKILL_LABELS[s].es}
                  </p>
                  <span className="font-mono text-xs text-violet">Rang {rank}/5</span>
                </div>
                <p className="text-xs text-muted" lang="de">
                  {SKILL_LABELS[s].de}
                </p>
                <ProgressBar value={rank >= 5 ? 1 : (st.xp - prevXp) / (nextXp - prevXp)} color="violet" className="mt-2" />
                <p className="mt-1.5 text-xs text-muted">
                  {st.xp} XP · {st.attempts ? `${Math.round(accuracy(st.correct, st.attempts) * 100)} % de aciertos (${st.correct}/${st.attempts})` : 'sin datos aún'}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Misiones */}
      <Panel className="p-5">
        <h2 className={h2}>Misiones</h2>
        <ul className="space-y-2">
          {Object.values(MISSIONS).map((m) => {
            const r = state.missions[m.id];
            return (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-ink/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="text-xs text-muted">
                    {m.subtitle} · {m.cefr}
                  </p>
                </div>
                {r?.completed ? <Stars n={r.bestStars} /> : <span className="text-xs text-muted">{m.playable ? 'Pendiente' : 'Próximamente'}</span>}
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Logros */}
      <Panel className="p-5">
        <h2 className={h2}>
          Logros · {Object.keys(state.achievements).length}/{ACHIEVEMENTS.length}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const got = !!state.achievements[a.id];
            return (
              <div
                key={a.id}
                title={`${a.title}: ${a.description}`}
                className={`flex flex-col items-center rounded-xl border p-2 text-center ${got ? 'border-violet/50 bg-violet/10' : 'border-line opacity-40 grayscale'}`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="mt-1 text-[10px] leading-tight">{a.title}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Diario de decisiones */}
      <Panel className="p-5 lg:col-span-3">
        <h2 className={h2}>Diario · Tagebuch</h2>
        <ol className="space-y-1.5 text-sm">
          {[...state.journal].reverse().map((j, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 font-mono text-xs text-muted">{new Date(j.t).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
              <span className="text-white/80">{j.text}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink/50 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="truncate font-mono text-sm font-bold">{value}</p>
    </div>
  );
}
