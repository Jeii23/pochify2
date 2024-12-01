package org.example.pochi;

import org.example.pochi.backend.Partida;
import org.example.pochi.backend.Jugador;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;
import java.util.Vector;

public class NewRoundController {

  private Partida partida;
  private Vector<Jugador> jugadorsEnOrdre;
  private int jugadorActual = 0;

  @FXML
  private Label jugadorLabel;

  @FXML
  private TextField betInputField;

  @FXML
  private Button finalizeButton;

  public void setPartida(Partida partida) {
    this.partida = partida;

    // Donar cartes abans de començar a demanar les apostes
    partida.donarCartes();

    // Obtenir l'ordre correcte dels jugadors
    this.jugadorsEnOrdre = partida.getJugadorsEnOrdre();

    // Mostrar el primer jugador per fer la seva aposta
    mostrarJugadorActual();
  }


  private void mostrarJugadorActual() {
    if (jugadorActual < jugadorsEnOrdre.size()) {
      jugadorLabel.setText("Aposta per " + jugadorsEnOrdre.get(jugadorActual).getNom());
      betInputField.clear();
    } else {
      // Tots els jugadors han fet la seva aposta
      finalitzarApostes();
    }
  }

  @FXML
  private void onFinalizeClick() {
    String apostaText = betInputField.getText();
    try {
      int aposta = Integer.parseInt(apostaText);

      // Establir l'aposta pel jugador actual
      jugadorsEnOrdre.get(jugadorActual).setApostaActual(aposta);

      // Comprovar si és l'últim jugador
      if (jugadorActual == jugadorsEnOrdre.size() - 1) {
        if (!partida.comprovaAposta()) {
          // Aposta no vàlida, demanar una altra aposta
          jugadorLabel.setText("No pots fer aquest número d'apostes. Introduïu una altra aposta per " + jugadorsEnOrdre.get(jugadorActual).getNom());
          betInputField.clear();
          return;
        }
      }

      // Passar al següent jugador
      jugadorActual++;
      mostrarJugadorActual();

    } catch (NumberFormatException e) {
      jugadorLabel.setText("Introduïu un número vàlid.");
    }
  }

  private void finalitzarApostes() {
    try {
      partida.donarCartes(); // Assegurar que es reparteixen les cartes
      partida.avançarJugadorInicial(); // Actualitzar el jugador inicial per a la següent ronda

      FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("game-details-view.fxml"));
      Scene scene = new Scene(fxmlLoader.load(), 400, 300);

      GameDetailsController controller = fxmlLoader.getController();
      controller.setPartida(partida);

      Stage stage = (Stage) finalizeButton.getScene().getWindow();
      stage.setScene(scene);
    } catch (IOException e) {
      System.err.println("Error al carregar la vista de detalls del joc: " + e.getMessage());
      e.printStackTrace();
    }
  }
}
