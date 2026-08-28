import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugPanel } from './DebugPanel';

describe('DebugPanel', () => {
  it('reflects the debug prop on the checkbox and calls onToggleDebug on click', async () => {
    // Validates: Requirements 8.1
    const user = userEvent.setup();
    const onToggleDebug = vi.fn();
    render(
      <DebugPanel
        debug={false}
        onToggleDebug={onToggleDebug}
        humanChainLength={2}
        computerChainLength={3}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: /Debug mode/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(onToggleDebug).toHaveBeenCalledTimes(1);
  });

  it('shows a checked checkbox when debug is enabled', () => {
    // Validates: Requirements 8.1
    render(
      <DebugPanel
        debug={true}
        onToggleDebug={vi.fn()}
        humanChainLength={2}
        computerChainLength={3}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /Debug mode/i })).toBeChecked();
  });

  it('hides chain-length values when debug is disabled', () => {
    // Validates: Requirements 8.5
    render(
      <DebugPanel
        debug={false}
        onToggleDebug={vi.fn()}
        humanChainLength={2}
        computerChainLength={3}
      />,
    );

    expect(screen.queryByTestId('human-chain-length')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('computer-chain-length'),
    ).not.toBeInTheDocument();
  });

  it('renders Human and Computer chain lengths when debug is enabled', () => {
    // Validates: Requirements 8.2, 8.3
    render(
      <DebugPanel
        debug={true}
        onToggleDebug={vi.fn()}
        humanChainLength={2}
        computerChainLength={4}
      />,
    );

    const human = screen.getByTestId('human-chain-length');
    const computer = screen.getByTestId('computer-chain-length');

    expect(human).toBeInTheDocument();
    expect(human).toHaveTextContent('2');
    expect(computer).toBeInTheDocument();
    expect(computer).toHaveTextContent('4');
  });
});
