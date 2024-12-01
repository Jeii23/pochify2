package org.example.pochi;

import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;
import org.example.pochi.backend.Partida;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class SetPlayerNamesController {

  private Partida partida;
  private List<TextField> nameFields = new ArrayList<>();

  @FXML
  private VBox playerNamesContainer;

  @FXML
  private Button confirmButton;

  public void setPartida(Partida partida) {
    this.partida = partida;
    generarCampsNoms();
  }

  private void generarCampsNoms() {
    int nJugadors = partida.getnJugadors();
    playerNamesContainer.getChildren().clear();
    nameFields.clear();

    for (int i = 0; i < nJugadors; i++) {
      TextField nameField = new TextField();
      nameField.setPromptText("Nom del jugador " + (i + 1));
      nameFields.add(nameField);
      playerNamesContainer.getChildren().add(nameField);
    }
  }

  @FXML
  private void onConfirmClick() {
    for (int i = 0; i < nameFields.size(); i++) {
      String nom = nameFields.get(i).getText().trim();
      if (!nom.isEmpty()) {
        partida.getJugadors().get(i).setNom(nom);
      }
    }

    // Navegar a la següent vista (new-round-view.fxml)
    try {
      FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("new-round-view.fxml"));
      Scene scene = new Scene(fxmlLoader.load(), 400, 300);

      NewRoundController controller = fxmlLoader.getController();
      controller.setPartida(partida);

      Stage stage = (Stage) confirmButton.getScene().getWindow();
      stage.setScene(scene);

    } catch (IOException e) {
      System.err.println("Error al carregar la vista de nova ronda: " + e.getMessage());
      e.printStackTrace();
    }
  }
}
