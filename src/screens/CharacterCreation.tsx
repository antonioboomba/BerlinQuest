import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Button, Panel } from '../components/ui';
import { BACKGROUNDS } from '../data/backgrounds';
import { COUNTRIES } from '../data/countries';
import { DEFAULT_SETTINGS } from '../engine/state';
import type { Accessory, Appearance, Background, CEFR, HairStyle, Settings } from '../engine/types';
import { useGame } from '../GameContext';

const SKINS = ['#f5d0b5', '#e8b48f', '#c98e64', '#a26a43', '#7a4b2c', '#4f301c'];
const HAIRS = ['#1c1410', '#4a2c1a', '#8a5a2b', '#d9b26a', '#c2452d', '#a855f7', '#39ff88', '#e5e7eb'];
const OUTFITS = ['#a855f7', '#39ff88', '#1f2937', '#ef4444', '#3b82f6', '#f59e0b'];
const STYLES: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Corto' },
  { id: 'long', label: 'Largo' },
  { id: 'curly', label: 'Rizado' },
  { id: 'buzz', label: 'Rapado' },
  { id: 'bun', label: 'Moño' },
];
const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: 'none', label: 'Nada' },
  { id: 'glasses', label: 'Gafas' },
  { id: 'beanie', label: 'Gorro' },
  { id: 'earring', label: 'Pendiente' },
];
export const LEVELS: { id: CEFR; title: string; text: string }[] = [
  { id: 'A1', title: 'A1 · Principiante', text: 'Frases cortas, traducciones visibles, banco de palabras.' },
  { id: 'A2', title: 'A2 · Básico', text: 'Frases algo más largas, aún con ayudas. XP ×1,2.' },
  { id: 'B1', title: 'B1 · Intermedio', text: 'Diálogos naturales, traducción al pulsar. XP ×1,5.' },
  { id: 'B2', title: 'B2 · Avanzado', text: 'Alemán coloquial y burocrático, sin red. XP ×2.' },
];

function Swatches({ colors, value, onChange, label }: { colors: string[]; value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={`h-8 w-8 rounded-full border-2 transition ${value === c ? 'scale-110 border-white' : 'border-transparent hover:scale-105'}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-lg border px-3 py-1.5 text-sm transition ${value === o.id ? 'border-acid bg-acid/10 text-acid' : 'border-line text-white/80 hover:border-white/30'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const label = 'mb-2 block text-xs font-semibold uppercase tracking-wider text-muted';
const input = 'w-full rounded-xl border border-line bg-ink/60 px-3 py-2.5 text-white outline-none placeholder:text-white/25 focus:border-acid';

export function CharacterCreation({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { dispatch } = useGame();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [origin, setOrigin] = useState('es');
  const [background, setBackground] = useState<Background>('musician');
  const [appearance, setAppearance] = useState<Appearance>({ skin: SKINS[1], hair: HAIRS[1], hairStyle: 'short', outfit: OUTFITS[0], accessory: 'none' });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [touched, setTouched] = useState(false);

  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => setAppearance((a) => ({ ...a, [k]: v }));
  const lastNameLetters = lastName.replace(/[^\p{L}]/gu, '');
  const valid = firstName.trim().length >= 2 && lastNameLetters.length >= 2 && lastNameLetters.length <= 16;
  const kit = BACKGROUNDS[background];

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    dispatch({
      type: 'NEW_GAME',
      player: { firstName: firstName.trim(), lastName: lastName.trim(), origin, background, appearance },
      settings,
    });
    onDone();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted hover:text-white">← Volver</button>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-acid">Neu in Berlin</p>
      </div>
      <h1 className="font-display text-3xl font-black sm:text-4xl">Crea tu personaje</h1>
      <p className="mt-1 text-sm text-muted">Tu apellido importa: en el Bürgeramt te tocará deletrearlo en alemán.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">
        <Panel className="flex flex-col items-center gap-3 p-5 lg:sticky lg:top-6 lg:self-start">
          <div className="animate-float">
            <Avatar a={appearance} size={160} />
          </div>
          <p className="font-display text-xl font-bold">
            {firstName || 'Vorname'} {lastName || 'Nachname'}
          </p>
          <p className="text-sm text-muted">
            {COUNTRIES.find((c) => c.id === origin)?.flag} {kit.de} · {settings.level}
          </p>
          <div className="w-full rounded-xl bg-ink/50 p-3 text-xs text-muted">
            <p>💶 Dinero inicial: <span className="text-white">{kit.money} €</span></p>
            <p className="mt-1">🎒 Pasaporte, móvil, llaves + {kit.emoji}</p>
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="fn">Nombre · Vorname</label>
              <input id="fn" className={input} value={firstName} maxLength={20} onChange={(e) => setFirstName(e.target.value)} placeholder="Lucía" />
            </div>
            <div>
              <label className={label} htmlFor="ln">Apellido · Nachname</label>
              <input id="ln" className={input} value={lastName} maxLength={20} onChange={(e) => setLastName(e.target.value)} placeholder="Ruiz" />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="origin">Origen · Herkunft</label>
              <select id="origin" className={input} value={origin} onChange={(e) => setOrigin(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag} {c.es} — aus {c.de}
                  </option>
                ))}
              </select>
            </div>
            {touched && !valid && (
              <p className="text-sm text-amber-300 sm:col-span-2">Escribe un nombre y un apellido (2–16 letras) para poder deletrearlo.</p>
            )}
          </Panel>

          <Panel className="p-5">
            <span className={label}>Perfil · Hintergrund</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(BACKGROUNDS) as Background[]).map((b) => {
                const bg = BACKGROUNDS[b];
                return (
                  <button
                    key={b}
                    onClick={() => setBackground(b)}
                    className={`rounded-xl border p-3 text-left transition ${background === b ? 'glow-violet border-violet bg-violet/10' : 'border-line hover:border-white/30'}`}
                  >
                    <span className="text-2xl">{bg.emoji}</span>
                    <span className="mt-1 block font-semibold">{bg.title}</span>
                    <span className="block text-xs text-muted">{bg.blurb}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <span className={label}>Piel</span>
              <Swatches label="Piel" colors={SKINS} value={appearance.skin} onChange={(c) => set('skin', c)} />
            </div>
            <div>
              <span className={label}>Color de pelo</span>
              <Swatches label="Pelo" colors={HAIRS} value={appearance.hair} onChange={(c) => set('hair', c)} />
            </div>
            <div>
              <span className={label}>Peinado</span>
              <Chips options={STYLES} value={appearance.hairStyle} onChange={(v) => set('hairStyle', v)} />
            </div>
            <div>
              <span className={label}>Ropa</span>
              <Swatches label="Ropa" colors={OUTFITS} value={appearance.outfit} onChange={(c) => set('outfit', c)} />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>Accesorio</span>
              <Chips options={ACCESSORIES} value={appearance.accessory} onChange={(v) => set('accessory', v)} />
            </div>
          </Panel>

          <Panel className="p-5">
            <span className={label}>Nivel de alemán</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSettings((s) => ({ ...s, level: l.id, translations: l.id === 'A1' || l.id === 'A2' ? 'always' : 'tap' }))}
                  className={`rounded-xl border p-3 text-left transition ${settings.level === l.id ? 'border-acid bg-acid/10' : 'border-line hover:border-white/30'}`}
                >
                  <span className="block font-semibold">{l.title}</span>
                  <span className="block text-xs text-muted">{l.text}</span>
                </button>
              ))}
            </div>
            <span className={`${label} mt-4`}>Traducción al español</span>
            <Chips
              options={[
                { id: 'always', label: 'Siempre visible' },
                { id: 'tap', label: 'Al pulsar' },
                { id: 'never', label: 'Nunca' },
              ]}
              value={settings.translations}
              onChange={(v) => setSettings((s) => ({ ...s, translations: v }))}
            />
            <p className="mt-2 text-xs text-muted">Puedes cambiar el nivel y las traducciones en cualquier momento desde Ajustes.</p>
          </Panel>

          <Button variant="primary" className="py-3.5 text-base" onClick={submit}>
            Los geht’s! — Llegar a Berlín →
          </Button>
        </div>
      </div>
    </div>
  );
}
