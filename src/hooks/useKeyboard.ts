import { useEffect, useRef } from 'react';

/**
 * Callbacks invoked in response to keyboard input on the Game screen.
 *
 * The hook itself performs no game-state gating: whether movement/drop are
 * no-ops while it is the Computer's turn or the game has ended is the caller's
 * responsibility (the caller wires the relevant handlers to no-ops in those
 * cases). `onRestart` ('R') and `onHome` ('Q') are always active.
 */
export interface KeyboardHandlers {
  onLeft(): void; // MOVE_SELECTION left
  onRight(): void; // MOVE_SELECTION right
  onDown(): void; // DROP human into selectedColumn
  onRestart(): void; // 'r' / 'R'
  onHome(): void; // 'q' / 'Q'
}

/**
 * Attaches a `document` `keydown` listener while `enabled` is true and maps
 * keys to the supplied handlers:
 *
 *   - ArrowLeft  -> onLeft   (preventDefault)
 *   - ArrowRight -> onRight  (preventDefault)
 *   - ArrowDown  -> onDown   (preventDefault)
 *   - 'r' / 'R'  -> onRestart
 *   - 'q' / 'Q'  -> onHome
 *
 * The latest handlers are held in a ref so the listener is only (re)subscribed
 * when `enabled` changes, not on every render. The listener is removed on
 * unmount and whenever `enabled` becomes false.
 */
export function useKeyboard(handlers: KeyboardHandlers, enabled: boolean): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const h = handlersRef.current;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          h.onLeft();
          break;
        case 'ArrowRight':
          event.preventDefault();
          h.onRight();
          break;
        case 'ArrowDown':
          event.preventDefault();
          h.onDown();
          break;
        case 'r':
        case 'R':
          h.onRestart();
          break;
        case 'q':
        case 'Q':
          h.onHome();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
}
