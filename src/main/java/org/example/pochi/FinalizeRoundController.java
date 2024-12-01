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

public class FinalizeRoundController {

  private Partida partida;
  private int jugadorActual = 0; // Índex del jugador actual

  @FXML
  private Label jugadorLabel;

  @FXML
  private TextField roundInputField;

  @FXML
  private Button finalizeButton;

  public void setPartida(Partida partida) {
    this.partida = partida;
    mostrarJugadorActual(); // Mostrar el primer jugador
  }

  private void mostrarJugadorActual() {
    if (jugadorActual < partida.getnJugadors()) {
      jugadorLabel.setText("Encerts de " + partida.getJugadors().get(jugadorActual).getNom());
      roundInputField.clear();
    } else {
      // Quan tots els jugadors hagin introduït els encerts, mostrar nova ronda
      mostrarNovaVistaPuntuacions();
    }
  }

  @FXML
  private void onFinalizeClick() {
    String encertsText = roundInputField.getText();
    try {
      int encerts = Integer.parseInt(encertsText);

      // Actualitzar la puntuació del jugador actual
      partida.getJugadors().get(jugadorActual).calcularPuntuacio(
          partida.getTipusRonda(),
          encerts
      );

      // Passar al següent jugador
      jugadorActual++;
      mostrarJugadorActual();

    } catch (NumberFormatException e) {
      jugadorLabel.setText("Introduïu un número vàlid.");
    }
  }

  private void mostrarNovaVistaPuntuacions() {
    try {
      FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("view-scores-view.fxml"));
      Scene scene = new Scene(fxmlLoader.load(), 400, 300);

      ViewScoresController controller = fxmlLoader.getController();
      controller.setPartida(partida); // Passar la partida al controlador

      Stage stage = (Stage) finalizeButton.getScene().getWindow();
      stage.setScene(scene);

    } catch (IOException e) {
      System.err.println("Error al carregar la vista de puntuacions: " + e.getMessage());
      e.printStackTrace();
    }
  }

}
