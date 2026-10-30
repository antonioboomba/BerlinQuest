import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { gameReducer, initialState, type Action } from './engine/state';
import { loadGame, saveGame } from './engine/storage';
import type { GameState } from './engine/types';

interface GameCtx {
  state: GameState;
  dispatch: Dispatch<Action>;
  /** había partida guardada al abrir la app */
  hadSave: boolean;
  lastSaved: number | null;
  saveError: boolean;
}

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const loaded = useRef(loadGame());
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loaded.current ?? initialState());
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);

  // Autoguardado (con un pequeño retardo para agrupar cambios seguidos).
  useEffect(() => {
    if (!state.player) return;
    const t = setTimeout(() => {
      const ok = saveGame(state);
      setSaveError(!ok);
      if (ok) setLastSaved(Date.now());
    }, 300);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <Ctx.Provider value={{ state, dispatch, hadSave: !!loaded.current?.player, lastSaved, saveError }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGame(): GameCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame fuera de GameProvider');
  return c;
}
