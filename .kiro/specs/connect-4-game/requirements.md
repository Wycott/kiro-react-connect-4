# Requirements Document

## Introduction

This feature is a browser-based Connect 4 game built with TypeScript and React (18+) using functional components and hooks only. A single Human player competes against a Computer opponent on a standard 7-column by 6-row board. The Human selects a disc colour, always moves first, and alternates turns with the Computer. The Computer uses a center-weighted heuristic to choose moves. The application tracks session-persistent win counters, supports full keyboard-only play, provides sound effects, and includes a debug mode that reports and highlights each player's longest connected chain.

## Glossary

- **Game**: The Connect 4 application described by this document.
- **Board**: A grid of 7 columns and 6 rows, represented as `board[col][row]` where each cell is `null`, `'R'` (Red), or `'Y'` (Yellow).
- **Column**: A vertical set of 6 cells into which a disc may be dropped.
- **Row**: A horizontal set of 7 cells; row 0 is the lowest row.
- **Disc**: A game piece with colour Red (`'R'`) or Yellow (`'Y'`).
- **Human**: The player controlled by the user.
- **Computer**: The player controlled by the Game's heuristic logic.
- **Current_Player**: The player whose turn it is to drop a disc.
- **Selected_Column**: The Column currently targeted by the Human for a drop.
- **Home_Screen**: The initial view containing the title, colour selection, Start Game control, win counters, and instructions.
- **Game_Screen**: The view containing the Board, Current_Player indicator, debug control, win counters, and status text.
- **Win_Counter**: A numeric tally of games won, maintained separately for Human and Computer.
- **Session**: The period during which the Game runs in the browser without a full page reload.
- **Chain**: A set of consecutive same-colour Discs aligned horizontally, vertically, or diagonally.
- **Max_Chain_Length**: The length of the longest Chain for a given colour, ranging from 1 to 4.
- **Debug_Mode**: An optional state that displays and highlights each player's Max_Chain_Length data.
- **Heuristic**: The Computer's move-selection strategy: take an immediate win, else block the Human's immediate win, else prefer Columns closer to the Board center.
- **Sound_Hook**: The lightweight React hook that preloads and plays sound effects.

## Requirements

### Requirement 1: Home Screen and Colour Selection

**User Story:** As a Human, I want a home screen where I choose my disc colour and start the game, so that I can begin play with my preferred colour.

#### Acceptance Criteria

1. WHEN the Game loads, THE Home_Screen SHALL display the title "Connect 4".
2. THE Home_Screen SHALL present two colour options: "Human plays Red" and "Human plays Yellow".
3. WHEN the Human has not made a colour selection, THE Home_Screen SHALL default the selection to "Human plays Red".
4. WHEN the Human selects a colour option, THE Home_Screen SHALL record the selected colour as the Human's Disc colour.
5. THE Home_Screen SHALL display a "Start Game" control.
6. WHEN the Human activates the "Start Game" control, THE Game SHALL transition to the Game_Screen using the selected colour.
7. THE Home_Screen SHALL display the current Human Win_Counter and Computer Win_Counter.
8. THE Home_Screen SHALL display key instructions for the keyboard controls.

### Requirement 2: Board State and Disc Drop

**User Story:** As a Human, I want to drop discs into columns, so that I can build connections toward a win.

#### Acceptance Criteria

1. THE Board SHALL be represented as 7 Columns by 6 Rows with each cell holding `null`, `'R'`, or `'Y'`.
2. WHEN a disc is dropped into a Column that contains at least one empty cell, THE Game SHALL place the Disc in the lowest empty Row of that Column.
3. IF a disc is dropped into a Column with no empty cell, THEN THE Game SHALL reject the drop and leave the Board unchanged.
4. WHEN the Game_Screen is displayed at the start of a game, THE Board SHALL contain only `null` cells.

### Requirement 3: Turn Order

**User Story:** As a Human, I want to always move first and alternate turns with the Computer, so that play follows a predictable order.

#### Acceptance Criteria

1. WHEN a new game begins, THE Game SHALL set the Human as the Current_Player.
2. WHEN the Human completes a valid drop and the game has not ended, THE Game SHALL set the Computer as the Current_Player.
3. WHEN the Computer completes a valid drop and the game has not ended, THE Game SHALL set the Human as the Current_Player.
4. THE Game_Screen SHALL display an indicator identifying the Current_Player.

### Requirement 4: Win and Draw Detection

**User Story:** As a player, I want the game to detect wins and draws, so that outcomes are recognized and scored correctly.

#### Acceptance Criteria

1. WHEN a Disc placement creates a Chain of 4 same-colour Discs in a horizontal direction, THE Game SHALL declare the owner of that Chain the winner.
2. WHEN a Disc placement creates a Chain of 4 same-colour Discs in a vertical direction, THE Game SHALL declare the owner of that Chain the winner.
3. WHEN a Disc placement creates a Chain of 4 same-colour Discs in either diagonal direction, THE Game SHALL declare the owner of that Chain the winner.
4. WHEN the Human wins a game, THE Game SHALL increment the Human Win_Counter by 1.
5. WHEN the Computer wins a game, THE Game SHALL increment the Computer Win_Counter by 1.
6. WHEN all 42 Board cells are filled and no winner exists, THE Game SHALL declare the game a draw.
7. WHEN a game ends by win or draw, THE Game SHALL update the status text to describe the outcome.
8. WHEN a game has ended, THE Game SHALL reject further disc drops until the game is restarted.

### Requirement 5: Computer Heuristic

**User Story:** As a Human, I want the Computer to play with a center-weighted strategy, so that games are challenging and consistent.

#### Acceptance Criteria

1. WHEN the Computer is the Current_Player and a Column drop produces an immediate Computer win, THE Computer SHALL select that Column.
2. WHEN the Computer is the Current_Player and no immediate Computer win exists and a Human Column drop would produce an immediate Human win, THE Computer SHALL select the Column that blocks that Human win.
3. WHEN the Computer is the Current_Player and no immediate win or block applies, THE Computer SHALL select the available Column closest to the Board center.
4. WHEN the Computer selects a Column, THE Computer SHALL select only among Columns that contain at least one empty cell.

### Requirement 6: Keyboard Controls

**User Story:** As a Human, I want full keyboard control of the game, so that I can play without a mouse.

#### Acceptance Criteria

1. WHEN the Human presses the Left arrow key on the Game_Screen, THE Game SHALL move the Selected_Column one Column to the left, wrapping from the leftmost Column to the rightmost Column.
2. WHEN the Human presses the Right arrow key on the Game_Screen, THE Game SHALL move the Selected_Column one Column to the right, wrapping from the rightmost Column to the leftmost Column.
3. WHEN the Human presses the Down arrow key and the Selected_Column contains at least one empty cell, THE Game SHALL drop the Human's Disc into the Selected_Column.
4. IF the Human presses the Down arrow key and the Selected_Column contains no empty cell, THEN THE Game SHALL leave the Board unchanged.
5. WHEN the Human presses the "R" key, THE Game SHALL restart the current game with the same colours and Win_Counters and a cleared Board.
6. WHEN the Human presses the "Q" key, THE Game SHALL return to the Home_Screen, retaining the Win_Counters and clearing the Board.
7. THE Game_Screen SHALL visually highlight the Selected_Column.

### Requirement 7: Win Counters and Session Persistence

**User Story:** As a Human, I want win counters that persist across games in a session, so that I can track the running score.

#### Acceptance Criteria

1. THE Game SHALL maintain a Human Win_Counter and a Computer Win_Counter.
2. WHEN a new game starts within the same Session, THE Game SHALL retain the existing Win_Counter values.
3. WHEN the Human restarts a game with the "R" key, THE Game SHALL retain the existing Win_Counter values.
4. WHEN the Human returns to the Home_Screen with the "Q" key, THE Game SHALL retain the existing Win_Counter values.
5. THE Game_Screen SHALL display the Human Win_Counter and Computer Win_Counter.

### Requirement 8: Debug Mode

**User Story:** As a Human, I want a debug mode that shows each player's longest chain, so that I can inspect the board state during development.

#### Acceptance Criteria

1. THE Game_Screen SHALL display a debug checkbox.
2. WHEN Debug_Mode is enabled, THE Game SHALL display the Max_Chain_Length for the Human, valued from 1 to 4.
3. WHEN Debug_Mode is enabled, THE Game SHALL display the Max_Chain_Length for the Computer, valued from 1 to 4.
4. WHEN Debug_Mode is enabled, THE Game SHALL highlight the Board cells that form each player's longest Chain.
5. WHEN Debug_Mode is disabled, THE Game SHALL hide the Max_Chain_Length values and remove the Chain highlighting.

### Requirement 9: Sound Effects

**User Story:** As a Human, I want sound effects for game events, so that play feels responsive and engaging.

#### Acceptance Criteria

1. WHEN the Game initializes, THE Sound_Hook SHALL preload the sound effects.
2. WHEN a Disc is dropped, THE Game SHALL play the piece-drop sound effect.
3. WHEN a game ends in a win, THE Game SHALL play the win sound effect.
4. WHEN a game ends in a draw, THE Game SHALL play the draw sound effect.
5. WHERE the invalid-move sound is enabled, WHEN a drop is rejected, THE Game SHALL play the invalid-move sound effect.
6. WHERE a mute control is provided, WHEN the Human activates the mute control, THE Game SHALL suppress all sound effects.

### Requirement 10: User Experience and Accessibility

**User Story:** As a Human, I want a responsive and accessible interface, so that I can play comfortably using the keyboard on a desktop.

#### Acceptance Criteria

1. THE Game SHALL support complete play using keyboard input alone.
2. THE Game_Screen SHALL render the Board responsively for desktop viewport widths.
3. THE Game SHALL render Red and Yellow Discs with colour contrast sufficient to distinguish them against the Board background.
4. WHERE a drop animation is enabled, WHEN a Disc is dropped, THE Game SHALL animate the Disc moving to its resting Row.
5. THE Game_Screen SHALL expose the Current_Player indicator and status text as accessible text for assistive technologies.
