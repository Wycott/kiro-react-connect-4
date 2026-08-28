import { useState } from 'react';
import type { Disc } from '../logic/types';
import styles from './HomeScreen.module.css';

export interface HomeScreenProps {
  humanWins: number;
  computerWins: number;
  onStart: (humanDisc: Disc) => void;
}

export function HomeScreen({ humanWins, computerWins, onStart }: HomeScreenProps) {
  const [selectedDisc, setSelectedDisc] = useState<Disc>('R');

  return (
    <main className={styles.home}>
      <h1 className={styles.title}>Connect 4</h1>

      <fieldset className={styles.colours}>
        <legend>Choose your colour</legend>
        <label className={styles.option}>
          <input
            type="radio"
            name="human-colour"
            value="R"
            checked={selectedDisc === 'R'}
            onChange={() => setSelectedDisc('R')}
          />
          Human plays Red
        </label>
        <label className={styles.option}>
          <input
            type="radio"
            name="human-colour"
            value="Y"
            checked={selectedDisc === 'Y'}
            onChange={() => setSelectedDisc('Y')}
          />
          Human plays Yellow
        </label>
      </fieldset>

      <button
        type="button"
        className={styles.start}
        onClick={() => onStart(selectedDisc)}
      >
        Start Game
      </button>

      <section className={styles.scores} aria-label="Win counters">
        <p>Human wins: {humanWins}</p>
        <p>Computer wins: {computerWins}</p>
      </section>

      <section className={styles.instructions} aria-label="Keyboard controls">
        <h2 className={styles.instructionsHeading}>Keyboard controls</h2>
        <ul>
          <li>Left / Right arrows: move the selected column</li>
          <li>Down arrow: drop a disc into the selected column</li>
          <li>R: restart the current game</li>
          <li>Q: return to this home screen</li>
        </ul>
      </section>
    </main>
  );
}
