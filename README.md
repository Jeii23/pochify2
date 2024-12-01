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

## Technologies Used

- **Java 11 or higher**
- **JavaFX**
- **Maven**

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

