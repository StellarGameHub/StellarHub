// src/renderer/services/gamepad.ts
let active = false;
let animationId: number | null = null;
let callbacks: {
  onDirectionChange?: (dx: number, dy: number, buttons: readonly GamepadButton[]) => void;
  onAccept?: () => void;
  onBack?: () => void;
  onHome?: () => void;   // nuevo
} = {};



export function startGamepadListening(
  newCallbacks: {
    onDirectionChange?: (dx: number, dy: number, buttons: readonly GamepadButton[]) => void;
    onAccept?: () => void;
    onBack?: () => void;
    onHome: () => void,
  }
) {
  if (active) return;
  active = true;
  callbacks = newCallbacks;

  function pollGamepad() {
    if (!active) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; // primer mando conectado
    if (gp) {
      const axes = gp.axes;
      let dx = Math.abs(axes[0]) > 0.2 ? axes[0] : 0;
      let dy = Math.abs(axes[1]) > 0.2 ? axes[1] : 0;
      if (callbacks.onDirectionChange) {
        callbacks.onDirectionChange(dx, dy, gp.buttons);
      }
      const buttons = gp.buttons;
      if (buttons[0]?.pressed && callbacks.onAccept) callbacks.onAccept();   // Botón A (cross)
      if (buttons[1]?.pressed && callbacks.onBack) callbacks.onBack();      // Botón B (circle)

      const homeButtonIndex = 16; // común en la mayoría
      if (buttons[homeButtonIndex]?.pressed && callbacks.onHome) {
        callbacks.onHome();
      }
    }
    animationId = requestAnimationFrame(pollGamepad);
  }
  pollGamepad();
}

export function stopGamepadListening() {
  active = false;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
}