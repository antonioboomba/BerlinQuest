/** Estado compartido de los controles táctiles (joystick virtual + botón E). */
export const touchInput = {
  active: false,
  x: 0,
  y: 0,
  onInteract: null as (() => void) | null,
};
