import { useEffect, useRef, useState } from 'react';
import { Toasts, type Toast } from './components/Toasts';
import { ACHIEVEMENTS } from './data/achievements';
import { levelFromXp } from './engine/progression';
import { useGame } from './GameContext';
import { CharacterCreation } from './screens/CharacterCreation';
import { GameShell, type Tab } from './screens/GameShell';
import { MissionScreen } from './screens/MissionScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';

type Screen = { name: 'welcome' } | { name: 'create' } | { name: 'game'; tab: Tab } | { name: 'mission'; missionId: string };

export default function App() {
  const { state } = useGame();
  const [screen, setScreen] = useState<Screen>({ name: 'welcome' });
  const toasts = useProgressToasts();

  // Si se borra la partida desde ajustes, volver a la bienvenida.
  useEffect(() => {
    if (!state.player && (screen.name === 'game' || screen.name === 'mission')) setScreen({ name: 'welcome' });
  }, [state.player, screen.name]);

  return (
    <>
      {screen.name === 'welcome' && (
        <WelcomeScreen onNew={() => setScreen({ name: 'create' })} onContinue={() => setScreen({ name: 'game', tab: 'map' })} />
      )}
      {screen.name === 'create' && (
        <CharacterCreation onDone={() => setScreen({ name: 'game', tab: 'map' })} onBack={() => setScreen({ name: 'welcome' })} />
      )}
      {screen.name === 'game' && state.player && (
        <GameShell
          tab={screen.tab}
          onTab={(tab) => setScreen({ name: 'game', tab })}
          onStartMission={(missionId) => setScreen({ name: 'mission', missionId })}
          onExit={() => setScreen({ name: 'welcome' })}
        />
      )}
      {screen.name === 'mission' && state.player && (
        <MissionScreen missionId={screen.missionId} onExit={(tab) => setScreen({ name: 'game', tab: tab ?? 'map' })} />
      )}
      <Toasts toasts={toasts.list} onDismiss={toasts.dismiss} />
    </>
  );
}

/** Notifica logros nuevos y subidas de nivel comparando con el estado anterior. */
function useProgressToasts() {
  const { state } = useGame();
  const [list, setList] = useState<Toast[]>([]);
  const prev = useRef<{ level: number; achievements: string[]; player: boolean } | null>(null);

  useEffect(() => {
    const level = levelFromXp(state.xp).level;
    const achievements = Object.keys(state.achievements);
    const p = prev.current;
    // Solo comparamos dentro de la misma partida (no al cargar/crear).
    if (p && p.player && state.player) {
      const fresh: Toast[] = [];
      for (const id of achievements.filter((a) => !p.achievements.includes(a))) {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (a) fresh.push({ id: `${id}-${Date.now()}`, emoji: a.emoji, title: `Logro: ${a.title}`, text: a.description, tone: 'violet' });
      }
      if (level > p.level) {
        fresh.push({ id: `lvl-${level}`, emoji: '⬆️', title: `¡Nivel ${level}!`, text: 'Sigue así. Nuevos barrios te esperan.', tone: 'acid' });
      }
      if (fresh.length) setList((l) => [...l, ...fresh]);
    }
    prev.current = { level, achievements, player: !!state.player };
  }, [state.xp, state.achievements, state.player]);

  return { list, dismiss: (id: string) => setList((l) => l.filter((t) => t.id !== id)) };
}
