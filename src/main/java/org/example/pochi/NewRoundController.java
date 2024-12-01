package org.example.pochi;

import org.example.pochi.backend.Partida;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;

public class NewRoundController {

  private Partida partida;

  @FXML
  private TextField betInputField;

  @FXML
  private Button finalizeButton;

  public void setPartida(Partida partida) {
    this.partida = partida;
  }

  @FXML
  private void onFinalizeClick() throws IOException {
    String apuestas = betInputField.getText();
    String[] apuestaArray = apuestas.split(",");

    // Lógica hardcodeada de actualización de apuestas
    // Ejemplo: partida.setApuestas(apuestaArray);
    System.out.println("Noves apostes: " + apuestas);
    FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("game-details-view.fxml"));
    Scene scene = new Scene(fxmlLoader.load(), 400, 300);

    GameDetailsController controller = fxmlLoader.getController();
    controller.setPartida(partida); // Pasar instancia de partida

    Stage stage = (Stage) finalizeButton.getScene().getWindow();
    stage.setScene(scene);
  }
}
