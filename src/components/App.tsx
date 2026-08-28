import { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { GameScreen } from './GameScreen';
import type { Disc, Player } from '../logic/types';

type Screen = 'home' | 'game';

interface WinCounters {
  human: number;
  computer: number;
}

/**
 * Root component and single owner of the state that must survive screen
 * transitions: the active screen, the Human's chosen disc colour, and the
 * session win counters. `GameScreen` owns per-game reducer state and is
 * remounted on each Start via a changing `key` (`gameId`) so a fresh game
 * clears the board without disturbing the App-level counters.
 *
 * Validates: Requirements 1.6, 4.4, 4.5, 6.6, 7.1, 7.2, 7.3, 7.4
 */
export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [humanDisc, setHumanDisc] = useState<Disc>('R');
  const [winCounters, setWinCounters] = useState<WinCounters>({
    human: 0,
    computer: 0,
  });
  // Bumped on each Start so GameScreen remounts and resets its reducer state
  // for a brand-new game. Counters live here and are never reset on remount.
  const [gameId, setGameId] = useState(0);

  // Req 1.6: transition to the Game screen using the selected colour.
  const handleStart = (disc: Disc) => {
    setHumanDisc(disc);
    setGameId((id) => id + 1);
    setScreen('game');
  };

  // Req 6.6, 7.4: return to Home, retaining the counters.
  const handleHome = () => {
    setScreen('home');
  };

  // Req 4.4, 4.5, 7.1: increment the winner's counter exactly once. GameScreen
  // invokes this once per transition into a win status.
  const handleWin = (winner: Player) => {
    setWinCounters((counters) => ({
      ...counters,
      [winner]: counters[winner] + 1,
    }));
  };

  if (screen === 'game') {
    return (
      <GameScreen
        key={gameId}
        humanDisc={humanDisc}
        humanWins={winCounters.human}
        computerWins={winCounters.computer}
        onHome={handleHome}
        onWin={handleWin}
      />
    );
  }

  return (
    <HomeScreen
      humanWins={winCounters.human}
      computerWins={winCounters.computer}
      onStart={handleStart}
    />
  );
}
