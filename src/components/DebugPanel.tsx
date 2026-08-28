import styles from './DebugPanel.module.css';

export interface DebugPanelProps {
  debug: boolean;
  onToggleDebug: () => void;
  humanChainLength: number;
  computerChainLength: number;
}

// Renders the debug checkbox and, when debug is enabled, the Human and Computer
// Max_Chain_Length values (1..4). When debug is disabled the values are not
// rendered at all.
// Validates: Requirements 8.1, 8.2, 8.3, 8.5
export function DebugPanel({
  debug,
  onToggleDebug,
  humanChainLength,
  computerChainLength,
}: DebugPanelProps) {
  return (
    <div className={styles.debugPanel} data-testid="debug-panel">
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={debug}
          onChange={onToggleDebug}
          data-testid="debug-checkbox"
        />
        Debug mode
      </label>

      {debug && (
        <div className={styles.chains} data-testid="debug-chains">
          <span data-testid="human-chain-length">
            Human Max Chain: {humanChainLength}
          </span>
          <span data-testid="computer-chain-length">
            Computer Max Chain: {computerChainLength}
          </span>
        </div>
      )}
    </div>
  );
}
