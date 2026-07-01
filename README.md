# Pochify

Pochify is a JavaFX-based implementation of the traditional Spanish card game **La Pocha**. This interactive application allows players to enjoy the classic game with friends, featuring dynamic player names, rotating player order, bidding, and scoring mechanisms. Developed during a hackathon, Pochify aims to deliver an engaging digital experience of La Pocha.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [How to Play](#how-to-play)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Contributors](#contributors)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- **User-Friendly Interface**: Intuitive GUI built with JavaFX for an enjoyable user experience.
- **Custom Player Names**: Ability to input and display custom names for each player.
- **Rotating Player Order**: Automatic rotation of the starting player each round.
- **Bidding System**: Players place bids, with validation to prevent invalid bids.
- **Scoring Mechanism**: Automatic calculation and updating of player scores after each round.
- **Consistent Window Size**: Maintains the same window size across different views for a seamless experience.
- **Keyboard Shortcuts**: Supports pressing "Enter" to submit inputs for faster gameplay.

## Getting Started

### Prerequisites

- **Java Development Kit (JDK) 11 or higher**
  - Download and install from [Oracle's website](https://www.oracle.com/java/technologies/javase-jdk11-downloads.html) or use OpenJDK.
- **Maven**
  - Download and install from [Maven's website](https://maven.apache.org/download.cgi).

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/pochify.git
   cd pochify
   ```

2. **Build the Project with Maven**

   ```bash
   mvn clean package
   ```

   This will compile the project and package it into a runnable JAR file located in the `target` directory.

3. **Run the Application**

   ```bash
   java -jar target/pochify-1.0.jar
   ```

   Make sure to adjust the JAR file name according to the version generated.

## How to Play

1. **Launch the Game**

   Run the application using the command above.

2. **Select Number of Players**

   - Choose between 3, 4, or 5 players on the startup screen.

3. **Enter Player Names**

   - Input custom names for each player in the provided text fields.

4. **Place Bids**

   - Players take turns to place their bids.
   - The last player is restricted from making a bid that would make the total bids equal to the number of cards in the round.

5. **View Round Details**

   - After all bids are placed, the round details are displayed, including round number, type, number of cards, and player bids.

6. **Input Tricks Won**

   - Each player inputs the number of tricks they won in the round.

7. **View Updated Scores**

   - Scores are calculated based on bids and tricks won.
   - The updated scores are displayed for all players.

8. **Proceed to Next Round**

   - The starting player rotates, and the next round begins.
   - Repeat the bidding and playing process until the game concludes.

## Project Structure

- **`src/main/java/org/example/pochi/`**: Contains the main application and controllers.
  - **`GameApplication.java`**: The entry point of the application.
  - **Controllers**:
    - `GameController.java`: Handles the initial game setup.
    - `SetPlayerNamesController.java`: Manages player name input.
    - `NewRoundController.java`: Manages bidding for each round.
    - `GameDetailsController.java`: Displays round details.
    - `FinalizeRoundController.java`: Handles input of tricks won.
    - `ViewScoresController.java`: Displays updated scores after each round.
- **`src/main/java/org/example/pochi/backend/`**: Contains game logic and data models.
  - **`Partida.java`**: Manages game state, player rotation, and round progression.
  - **`Jugador.java`**: Represents a player with attributes like name, score, and current bid.
  - **`TipusRonda.java`**: Enum defining different types of rounds.
- **`src/main/resources/org/example/pochi/`**: Contains FXML files for the UI layouts.
  - `game-view.fxml`: Startup screen for selecting the number of players.
  - `set-player-names-view.fxml`: Screen for entering player names.
  - `new-round-view.fxml`: Screen where players place their bids.
  - `game-details-view.fxml`: Displays details after bidding.
  - `finalize-round-view.fxml`: Screen where players input the number of tricks won.
  - `view-scores-view.fxml`: Displays updated scores after each round.
- **`web/`**: Mobile-first static web port based on the SwiftUI flow.
  - `index.html`: Browser entry point.
  - `game-core.js`: JavaScript port of the iOS `PochifyCore` rules.
  - `app.js` and `styles.css`: Touch-friendly web interface.
  - `game-core.test.js`: Node-based regression tests for the web rules.

## Native iOS SwiftUI Port

A new native iOS implementation lives in **`ios/PochifyIOS/`**. It keeps the JavaFX desktop app intact and ports the backend rules into Swift.

### How to open and run in Xcode

1. Open the project on macOS with Xcode 15 or newer:

   ```bash
   open ios/PochifyIOS/PochifyIOS.xcodeproj
   ```

2. Select the **PochifyIOS** scheme.
3. Choose an iPhone simulator.
4. Press **Run**.

The WSL/Linux environment can compile and test the shared Swift logic, but it cannot run the SwiftUI iOS interface because the iOS simulator and SwiftUI runtime require macOS and Xcode.

### Swift project layout

- **`ios/PochifyIOS/Sources/PochifyCore/`**: Testable game logic ported from the Java backend.
  - `GameEngine.swift`: Swift equivalent of the state and round progression in `Partida.java`.
  - `Player.swift`: Swift equivalent of `Jugador.java`, including the score formula.
  - `RoundType.swift`: Swift equivalent of `TipusRonda.java`.
  - `RoundSummary.swift`: Small value types used to describe rounds and results.
- **`ios/PochifyIOS/Sources/PochifyIOS/`**: SwiftUI app and MVVM flow.
  - `GameViewModel.swift`: UI-facing coordinator around `GameEngine`.
  - `ContentView.swift` and `GameScreens.swift`: Mobile-first screens for setup, bidding, tricks, scores, and final ranking.
- **`ios/PochifyIOS/Tests/PochifyCoreTests/`**: Unit tests for the ported rules.
- **`ios/PochifyIOS/Package.swift`**: SwiftPM entry point for running the logic tests outside Xcode.
- **`ios/PochifyIOS/PochifyIOS.xcodeproj`**: Xcode wrapper with app, core framework, and test targets.

### Java logic mapping

- `Partida.calcularNCartes` maps to `GameEngine.calculateTotalCards(playerCount:)`.
- `Partida.calcularNRondes` maps to `GameEngine.calculateTotalRounds(playerCount:totalCards:)`.
- `Partida.donarCartes` and `calcularTipusRonda` map to `GameEngine.beginNextRound()`, `cardsPerPlayer(for:)`, and `roundType(for:)`.
- `Partida.getJugadorsEnOrdre` and `avançarJugadorInicial` map to `playerOrderIDs(startingAt:)` and the rotation performed after `completeRound`.
- `Partida.comprovaAposta` maps to `bidValidationMessage(playerID:bid:)`, preserving the last-player rule that total bids cannot equal the cards in the round.
- `Jugador.calcularPuntuacio` maps to `Player.scoreDelta(roundType:bid:tricksWon:)` and `applyScore(roundType:tricksWon:)`.
- `TipusRonda` maps to `RoundType` with the same cases: `BASIC`, `SIN_PALO`, `SUBASTA`, `DADO`, `MANO_PINTA`, and `OROS_DOBLES`.

### Intentional changes and old quirks found

- The JavaFX UI has no end-of-game check in `ViewScoresController`; the iOS app adds a final ranking screen when `currentRound >= totalRounds`.
- The iOS app validates bids and tricks with steppers and requires total tricks won to equal the cards in the round. This is a UI/data-entry guard; the scoring formula is unchanged.
- The old `Partida.getJugadorFinal()` hard-codes `4` and is not used by the JavaFX controller flow.
- The old `Partida.afegeixJugador` compares strings with `!=` and is not used by the JavaFX player-name screen.
- `NewRoundController` calls `donarCartes()` more than once around bidding; the Swift engine centralizes this in `beginNextRound()` for a single active round.

### Installed tooling in this workspace

Java 21 and Maven are already available for the existing JavaFX project. Swift was installed with the official Swiftly installer under:

```bash
/home/jaume/.local/share/swiftly
```

Swiftly also created `.swift-version` with `Swift 6.3.3` for this repository.

If your shell has not picked up Swiftly yet, load it with:

```bash
. /home/jaume/.local/share/swiftly/env.sh
```

In this sandboxed WSL session, SwiftPM cache writes to the real home directory are restricted, so the verified test command uses temporary writable caches:

```bash
cd ios/PochifyIOS
HOME=/tmp/pochify-swift-home XDG_CACHE_HOME=/tmp/pochify-swift-cache /home/jaume/.local/share/swiftly/toolchains/6.3.3/usr/bin/swift test
```

On a normal macOS or Linux shell after loading Swiftly, this should usually be enough:

```bash
cd ios/PochifyIOS
swift test
```

## Mobile Web Port

A static mobile web version now lives in **`web/`**. It adapts the iOS SwiftUI flow for a phone browser: large touch targets, safe-area spacing, sticky primary actions, local game restore with `localStorage`, and the same bidding, tricks, rotation, scoring, and final-ranking rules as the Swift core.

### How to open locally

You can open `web/index.html` directly in a browser. To test it from a phone on the same network, serve the folder with any static server, for example:

```bash
python3 -m http.server 8000 -d web
```

Then open `http://<computer-ip>:8000` on the phone.

### Web test command

```bash
node web/game-core.test.js
```

## Technologies Used

- **Java 11 or higher**
- **JavaFX**
- **Maven**
- **Swift 6.3.3**
- **SwiftUI**
- **XCTest**
- **HTML**
- **CSS**
- **JavaScript**

## Contributors

- **Jaume Costa** - [jeiidev@proton.me](mailto:jeiidev@proton.me)
- **Noa Capellas** - [ainoa.cpalen@gmail.com](mailto:ainoa.cpalen@gmail.com)


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Hackathon Organizers**: For providing the platform to develop this project.
- **JavaFX Community**: For resources and tutorials that aided development.
- **Testers**: Friends and colleagues who tested the game and provided valuable feedback.

---
