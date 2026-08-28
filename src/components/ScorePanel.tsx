import styles from './ScorePanel.module.css';

export interface ScorePanelProps {
  humanWins: number;
  computerWins: number;
}

// Renders both session win counters. Labels are plain text so tests can query
// by role/text (e.g. "Human: 3", "Computer: 2").
// Validates: Requirements 7.5
export function ScorePanel({ humanWins, computerWins }: ScorePanelProps) {
  return (
    <div className={styles.scorePanel} data-testid="score-panel">
      <span className={styles.score} data-testid="human-score">
        Human: {humanWins}
      </span>
      <span className={styles.score} data-testid="computer-score">
        Computer: {computerWins}
      </span>
    </div>
  );
}
