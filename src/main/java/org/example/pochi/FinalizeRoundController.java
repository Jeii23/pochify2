package org.example.pochi;

import org.example.pochi.backend.Partida;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;

public class FinalizeRoundController {

  private Partida partida;

  @FXML
  private TextField roundInputField;

  @FXML
  private Button finalizeButton;

  public void setPartida(Partida partida) {
    this.partida = partida;
  }

  @FXML
  private void onFinalizeClick() throws IOException {
    int aciertos = Integer.parseInt(roundInputField.getText());

    // Lógica hardcodeada de actualización de puntuación
    // Ejemplo: partida.actualizarPuntuacion(aciertos);
    System.out.println("Aciertos ingresados: " + aciertos);

    FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("new-round-view.fxml"));
    Scene scene = new Scene(fxmlLoader.load(), 400, 300);

    NewRoundController controller = fxmlLoader.getController();
    controller.setPartida(partida); // Pasar instancia de partida

    Stage stage = (Stage) finalizeButton.getScene().getWindow();
    stage.setScene(scene);
  }
}
