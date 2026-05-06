// src/renderer/services/gamepad.ts
let active = false;
let animationId: number | null = null;
let onDirectionChange: ((dx: number, dy: number) => void) | null = null;
let onAccept: (() => void) | null = null;
let onBack: (() => void) | null = null;

export function startGamepadListening(
  callbacks: {
    onDirectionChange?: (dx: number, dy: number) => void;
    onAccept?: () => void;
    onBack?: () => void;
  }
) {
  if (active) return;
  active = true;
  onDirectionChange = callbacks.onDirectionChange || null;
  onAccept = callbacks.onAccept || null;
  onBack = callbacks.onBack || null;

  function pollGamepad() {
    if (!active) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0]; // solo el primer mando conectado
    if (gp) {
      const axes = gp.axes;
      const dx = Math.abs(axes[0]) > 0.2 ? axes[0] : 0;
      const dy = Math.abs(axes[1]) > 0.2 ? axes[1] : 0;
      if ((dx !== 0 || dy !== 0) && onDirectionChange) {
        onDirectionChange(dx, dy);
      }
      const buttons = gp.buttons;
      if (buttons[0]?.pressed && onAccept) onAccept();        // Botón A (cross)
      if (buttons[1]?.pressed && onBack) onBack();           // Botón B (circle)
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