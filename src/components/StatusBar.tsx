import type { GameStatus, Player } from '../logic/types';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  status: GameStatus;
}

const WINNER_LABEL: Record<Player, string> = {
  human: 'Human',
  computer: 'Computer',
};

function statusText(status: GameStatus): string {
  switch (status.kind) {
    case 'win':
      return `${WINNER_LABEL[status.winner]} wins!`;
    case 'draw':
      return 'Draw!';
    case 'playing':
    default:
      return '';
  }
}

// Announces the game outcome. Wrapped in aria-live="polite" so assistive
// technologies announce wins and draws when the game ends
// (Requirements 4.7, 10.5).
export function StatusBar({ status }: StatusBarProps) {
  return (
    <p className={styles.status} aria-live="polite">
      {statusText(status)}
    </p>
  );
}
