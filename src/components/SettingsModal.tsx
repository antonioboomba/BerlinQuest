import { useRef, useState } from 'react';
import { clearSave, exportSave, importSave } from '../engine/storage';
import { CEFR_LEVELS } from '../engine/types';
import { useGame } from '../GameContext';
import { useSpeech } from '../hooks/useSpeech';
import { Chips } from '../screens/CharacterCreation';
import { Button, Modal } from './ui';

const label = 'mb-2 block text-xs font-semibold uppercase tracking-wider text-muted';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useGame();
  const { speak, supported } = useSpeech();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState('');
  const s = state.settings;

  const onImport = async (f?: File) => {
    if (!f) return;
    const loaded = await importSave(f);
    if (!loaded?.player) return setMsg('Archivo no válido.');
    dispatch({ type: 'LOAD', state: loaded });
    setMsg('Partida importada.');
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajustes · Einstellungen">
      <div className="flex flex-col gap-5">
        <div>
          <span className={label}>Nivel de alemán</span>
          <Chips
            options={CEFR_LEVELS.map((l) => ({ id: l, label: l }))}
            value={s.level}
            onChange={(level) => dispatch({ type: 'UPDATE_SETTINGS', settings: { level } })}
          />
          <p className="mt-2 text-xs text-muted">Cambia la complejidad de los diálogos y las ayudas. Más nivel = más XP.</p>
        </div>
        <div>
          <span className={label}>Traducción al español</span>
          <Chips
            options={[
              { id: 'always', label: 'Siempre' },
              { id: 'tap', label: 'Al pulsar' },
              { id: 'never', label: 'Nunca' },
            ]}
            value={s.translations}
            onChange={(translations) => dispatch({ type: 'UPDATE_SETTINGS', settings: { translations } })}
          />
        </div>
        <div>
          <span className={label}>Voz alemana</span>
          {supported ? (
            <div className="flex flex-wrap items-center gap-3">
              <Chips
                options={[
                  { id: 'on', label: 'Activada' },
                  { id: 'off', label: 'Desactivada' },
                ]}
                value={s.tts ? 'on' : 'off'}
                onChange={(v) => dispatch({ type: 'UPDATE_SETTINGS', settings: { tts: v === 'on' } })}
              />
              <label className="flex items-center gap-2 text-sm text-muted">
                Velocidad
                <input
                  type="range"
                  min={0.6}
                  max={1.2}
                  step={0.1}
                  value={s.ttsRate}
                  onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', settings: { ttsRate: Number(e.target.value) } })}
                  className="accent-[#39ff88]"
                />
              </label>
              <Button variant="ghost" onClick={() => speak('Herzlich willkommen in Berlin!')}>🔊 Probar</Button>
            </div>
          ) : (
            <p className="text-sm text-muted">Tu navegador no soporta síntesis de voz.</p>
          )}
        </div>

        <div className="border-t border-line pt-4">
          <span className={label}>Partida</span>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportSave(state)}>⬇️ Exportar</Button>
            <Button onClick={() => fileRef.current?.click()}>⬆️ Importar</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
            {!confirmReset ? (
              <Button variant="danger" onClick={() => setConfirmReset(true)}>Borrar partida</Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => {
                  clearSave();
                  dispatch({ type: 'RESET' });
                  setConfirmReset(false);
                  onClose();
                }}
              >
                ¿Seguro? Pulsa para borrar
              </Button>
            )}
          </div>
          {msg && <p className="mt-2 text-sm text-acid">{msg}</p>}
          <p className="mt-3 text-xs text-muted">La partida se guarda automáticamente en este navegador. Exporta un .json para llevarla a otro dispositivo.</p>
        </div>
      </div>
    </Modal>
  );
}
