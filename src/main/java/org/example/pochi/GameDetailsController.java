package org.example.pochi;

import org.example.pochi.backend.Partida;
import org.example.pochi.backend.Jugador;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;

public class GameDetailsController {

  private Partida partida; // Referencia a la instancia de partida

  @FXML
  private Label roundNumberLabel;

  @FXML
  private Label roundTypeLabel;

  @FXML
  private ListView<String> playersListView;

  @FXML
  public void initialize() {
    // Hardcodeado por ahora, aquí irían los datos obtenidos del backend
    int roundNumber = 1; // Esto debería ser: partida.getRoundNumber();
    String roundType = "Normal"; // Esto debería ser: partida.getRoundType();
    String[] playerNames = {"Jugador 1", "Jugador 2", "Jugador 3"}; // partida.getPlayers().map(p -> p.getName());
    int[] playerScores = {10, 15, 20}; // partida.getPlayers().map(p -> p.getTotalScore());
    int[] playerBets = {3, 2, 4}; // partida.getPlayers().map(p -> p.getRoundBet());

    roundNumberLabel.setText("Número de ronda: " + roundNumber);
    roundTypeLabel.setText("Tipo de ronda: " + roundType);

    for (int i = 0; i < playerNames.length; i++) {
      String playerInfo = playerNames[i] + " - Puntuación: " + playerScores[i] + " - Apuesta: " + playerBets[i];
      playersListView.getItems().add(playerInfo);
    }
  }
}
