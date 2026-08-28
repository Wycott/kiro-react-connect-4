import styles from './Cell.module.css';
import type { Cell as CellValue } from '../logic/types';

export interface CellProps {
  /** Column index (0..6) of this cell. */
  col: number;
  /** Row index (0..5) of this cell; row 0 is the lowest row. */
  row: number;
  /** The disc occupying this cell, or null when empty. */
  value: CellValue;
  /** True when this cell belongs to the currently selected column. */
  selected: boolean;
  /** True when this cell is part of a highlighted longest chain (debug mode). */
  chainHighlight: boolean;
  /** True when this cell is part of the winning line (highlighted on a win). */
  winningCell?: boolean;
  /** True to apply the optional drop-animation class to the disc. */
  animateDrop?: boolean;
}

/**
 * Renders a single board cell. When occupied it shows a Red or Yellow disc with
 * sufficient colour contrast (see Cell.module.css); otherwise it renders empty.
 *
 * Exposes queryable hooks for tests:
 * - data-testid={`cell-${col}-${row}`}
 * - data-disc={'R' | 'Y' | 'empty'}
 * - data-selected / data-chain boolean attributes
 */
export function Cell({
  col,
  row,
  value,
  selected,
  chainHighlight,
  winningCell = false,
  animateDrop = false,
}: CellProps) {
  const cellClassNames = [
    styles.cell,
    selected ? styles.selected : '',
    chainHighlight ? styles.chain : '',
    winningCell ? styles.winning : '',
  ]
    .filter(Boolean)
    .join(' ');

  const discColour = value === 'R' ? 'red' : value === 'Y' ? 'yellow' : null;

  const discClassNames = value
    ? [
        styles.disc,
        value === 'R' ? styles.red : styles.yellow,
        animateDrop ? styles.drop : '',
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div
      className={cellClassNames}
      data-testid={`cell-${col}-${row}`}
      data-disc={value ?? 'empty'}
      data-selected={selected}
      data-chain={chainHighlight}
      data-winning={winningCell}
      role="gridcell"
    >
      {value && (
        <span
          className={discClassNames}
          data-disc-colour={discColour}
          aria-label={value === 'R' ? 'Red disc' : 'Yellow disc'}
        />
      )}
    </div>
  );
}

