import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('displays the "Connect 4" heading', () => {
    // Validates: Requirements 1.1
    render(<HomeScreen humanWins={0} computerWins={0} onStart={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Connect 4' }),
    ).toBeInTheDocument();
  });

  it('defaults the selection to Red with Yellow unchecked', () => {
    // Validates: Requirements 1.3
    render(<HomeScreen humanWins={0} computerWins={0} onStart={vi.fn()} />);

    const red = screen.getByRole('radio', { name: /Human plays Red/i });
    const yellow = screen.getByRole('radio', { name: /Human plays Yellow/i });

    expect(red).toBeChecked();
    expect(yellow).not.toBeChecked();
  });

  it('changes the selection when the Human picks Yellow', async () => {
    // Validates: Requirements 1.4
    const user = userEvent.setup();
    render(<HomeScreen humanWins={0} computerWins={0} onStart={vi.fn()} />);

    const red = screen.getByRole('radio', { name: /Human plays Red/i });
    const yellow = screen.getByRole('radio', { name: /Human plays Yellow/i });

    await user.click(yellow);

    expect(yellow).toBeChecked();
    expect(red).not.toBeChecked();
  });

  it('calls onStart with "R" by default when Start Game is clicked', async () => {
    // Validates: Requirements 1.6
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<HomeScreen humanWins={0} computerWins={0} onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: /Start Game/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith('R');
  });

  it('calls onStart with "Y" after selecting Yellow', async () => {
    // Validates: Requirements 1.4, 1.6
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<HomeScreen humanWins={0} computerWins={0} onStart={onStart} />);

    await user.click(screen.getByRole('radio', { name: /Human plays Yellow/i }));
    await user.click(screen.getByRole('button', { name: /Start Game/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith('Y');
  });

  it('displays the Human and Computer win counters', () => {
    // Validates: Requirements 1.7
    render(<HomeScreen humanWins={3} computerWins={5} onStart={vi.fn()} />);

    expect(screen.getByText(/Human wins:\s*3/)).toBeInTheDocument();
    expect(screen.getByText(/Computer wins:\s*5/)).toBeInTheDocument();
  });
});
