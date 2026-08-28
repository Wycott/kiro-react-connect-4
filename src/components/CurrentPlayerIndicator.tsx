import type { Player } from '../logic/types';
import styles from './CurrentPlayerIndicator.module.css';

interface CurrentPlayerIndicatorProps {
  currentPlayer: Player;
}

const PLAYER_LABEL: Record<Player, string> = {
  human: 'Human',
  computer: 'Computer',
};

// Announces whose turn it is. Exposed via aria-live="polite" so assistive
// technologies announce turn changes without interrupting the user
// (Requirements 3.4, 10.5).
export function CurrentPlayerIndicator({
  currentPlayer,
}: CurrentPlayerIndicatorProps) {
  return (
    <p className={styles.indicator} aria-live="polite">
      Current player: {PLAYER_LABEL[currentPlayer]}
    </p>
  );
}
