package org.example.pochi;

import org.example.pochi.backend.Partida;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.stage.Stage;

import java.io.IOException;

public class GameController {

  private Partida partida; // Instancia de la clase backend.Partida

  @FXML
  private Button threePlayersButton;

  @FXML
  private Button fourPlayersButton;

  @FXML
  protected void onThreePlayersClick() throws IOException {
    startNewGame(3);
  }

  @FXML
  protected void onFourPlayersClick() throws IOException {
    startNewGame(4);
  }

  private void startNewGame(int numPlayers) throws IOException {
    // Llamada al backend para iniciar una nueva partida
    partida = new Partida();
    //partida.newGame(numPlayers); // Método del backend para iniciar partida

    // Cambiar a la pantalla de detalles de la partida
    FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("game-details-view.fxml"));
    Scene scene = new Scene(fxmlLoader.load(), 600, 400);
    Stage stage = (Stage) threePlayersButton.getScene().getWindow();
    stage.setScene(scene);
  }
}
