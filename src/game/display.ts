// Resolución física de pantalla.
// El canvas se dibuja a píxeles reales del dispositivo (devicePixelRatio) para que nada se reescale
// después en el navegador (en Windows con escalado al 125 % o 150 % eso emborronaba el texto).
// Las escenas trabajan en píxeles lógicos (CSS) y aplican getDPR() como zoom de cámara.

export function getDPR(): number {
  return Math.max(1, Math.min(3, window.devicePixelRatio || 1));
}

/**
 * Zoom del HUD: el DPR redondeado a medios (1, 1,5, 2…). Así cada píxel de las letras pixel
 * ocupa siempre un número entero o medio de píxeles físicos y el texto queda nítido.
 */
export function uiZoom(): number {
  const physW = window.innerWidth * getDPR();
  // el mayor paso de 0,5 que no supere el DPR y deje al menos 1250 px lógicos para el HUD
  for (let z = Math.max(1, Math.round(getDPR() * 2) / 2); z > 1; z -= 0.5) if (physW / z >= 1250) return z;
  return 1;
}

/** Tamaño lógico (CSS px) de la ventana del juego. */
export function logicalSize(scale: { width: number; height: number }) {
  const d = getDPR();
  return { w: scale.width / d, h: scale.height / d };
}
