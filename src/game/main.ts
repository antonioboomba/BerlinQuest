import '@fontsource/dotgothic16/400.css';
import Phaser from 'phaser';
import { BarScene } from './scenes/BarScene';
import { BootScene } from './scenes/BootScene';
import { StreetScene } from './scenes/StreetScene';
import { UIScene } from './scenes/UIScene';
import { getDPR } from './display';
import { GameState } from './state/GameState';

// BERLIN QUEST — vertical slice: calle de Kreuzberg + bar «Kater Karlo».

async function start() {
  // Phaser dibuja el texto en canvas: la fuente debe estar cargada antes del primer frame.
  try {
    await document.fonts.load('400 20px "DotGothic16"');
  } catch {
    /* si falla, se usa la fuente de reserva */
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#141a2e',
    pixelArt: true,
    roundPixels: true,
    // canvas a píxeles físicos; el zoom 1/DPR lo devuelve a su tamaño CSS sin reescalado borroso
    scale: { mode: Phaser.Scale.NONE, width: Math.round(window.innerWidth * getDPR()), height: Math.round(window.innerHeight * getDPR()), zoom: 1 / getDPR() },
    input: { activePointers: 3 },
    scene: [BootScene, StreetScene, BarScene, UIScene],
  });
  window.addEventListener('resize', () => {
    const d = getDPR();
    game.scale.setZoom(1 / d);
    game.scale.resize(Math.round(window.innerWidth * d), Math.round(window.innerHeight * d));
  });
  // Enganche de depuración solo en desarrollo (lo usan las pruebas automáticas).
  if (import.meta.env.DEV) Object.assign(window, { __BQ: { game, state: GameState } });
}

void start();
