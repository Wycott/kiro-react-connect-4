import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { App } from '../components/App';

describe('scaffold', () => {
  it('renders the App with React Testing Library', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Connect 4' }),
    ).toBeInTheDocument();
  });

  it('runs a fast-check property', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
    );
  });
});
