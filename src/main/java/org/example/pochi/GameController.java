package org.example.pochi;

import javafx.event.ActionEvent;
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
  private Button fivePlayersButton;

  @FXML
  protected void onThreePlayersClick() throws IOException {
    startNewGame(3);
  }

  @FXML
  protected void onFourPlayersClick() throws IOException {
    startNewGame(4);
  }

  @FXML
  protected void onFivePlayersClick() throws IOException {
    startNewGame(5);
  }

  private void startNewGame(int numPlayers) throws IOException {
    // Inicialitzar una nova partida
    partida = new Partida(numPlayers);

    // Navegar a la vista per establir els noms dels jugadors
    FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("set-player-names-view.fxml"));
    Scene scene = new Scene(fxmlLoader.load(), 400, 300);

    // Passar la instància de partida al nou controlador
    SetPlayerNamesController controller = fxmlLoader.getController();
    controller.setPartida(partida);

    Stage stage = (Stage) threePlayersButton.getScene().getWindow();
    stage.setScene(scene);
  }

}
