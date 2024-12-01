package org.example.pochi;

import org.example.pochi.backend.Partida;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;

public class NewRoundController {

  private Partida partida;
  private int jugadorActual = 0; // Índex del jugador actual

  @FXML
  private Label jugadorLabel;

  @FXML
  private TextField betInputField;

  @FXML
  private Button finalizeButton;

  public void setPartida(Partida partida)throws IOException {
    this.partida = partida;
    mostrarJugadorActual(); // Mostrar el primer jugador
  }

  private void mostrarJugadorActual() throws IOException {
    if (jugadorActual < partida.getnJugadors()) {
      jugadorLabel.setText("Aposta per " + partida.getJugadors().get(jugadorActual).getNom());
      betInputField.clear();
    } else {
      // Quan tots els jugadors hagin apostat, passar a la vista següent
      finalitzarApostes();
    }
  }



  @FXML
  private void onFinalizeClick() throws IOException {
    String apostaText = betInputField.getText();
    try {
      int aposta = Integer.parseInt(apostaText);

      // Establir l'aposta per al jugador actual
      partida.setAposta(jugadorActual, aposta);

      // Passar al següent jugador
      jugadorActual++;
      mostrarJugadorActual();

    } catch (NumberFormatException e) {
      jugadorLabel.setText("Introduïu un número vàlid.");
    }
  }


  private void finalitzarApostes() {
    try {
      FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("game-details-view.fxml"));
      Scene scene = new Scene(fxmlLoader.load(), 400, 300);

      GameDetailsController controller = fxmlLoader.getController();
      controller.setPartida(partida); // Passar la partida al controlador

      Stage stage = (Stage) finalizeButton.getScene().getWindow();
      stage.setScene(scene);
    } catch (IOException e) {
      System.err.println("Error al carregar la vista de detalls del joc: " + e.getMessage());
      e.printStackTrace();
    }
  }

}
