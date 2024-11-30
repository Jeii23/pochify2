package org.example.pochi;

import javafx.fxml.FXML;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;

public class GameController {
  @FXML
  private Button threePlayersButton;

  @FXML
  private Button fourPlayersButton;

  @FXML
  protected void onThreePlayersClick() {
    Alert alert = new Alert(Alert.AlertType.INFORMATION);
    alert.setTitle("Seleccionar Jugadores");
    alert.setHeaderText(null);
    alert.setContentText("Has seleccionado 3 jugadores.");
    alert.showAndWait();
  }

  @FXML
  protected void onFourPlayersClick() {
    Alert alert = new Alert(Alert.AlertType.INFORMATION);
    alert.setTitle("Seleccionar Jugadores");
    alert.setHeaderText(null);
    alert.setContentText("Has seleccionado 4 jugadores.");
    alert.showAndWait();
  }
}
