package org.example.pochi;

import org.example.pochi.backend.Partida;
import org.example.pochi.backend.Jugador;
import org.example.pochi.backend.TipusRonda;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;
import java.util.Vector;

public class ViewScoresController {

  private Partida partida;

  @FXML
  private Label roundNumberLabel;

  @FXML
  private Label roundTypeLabel;

  @FXML
  private Label roundCardsLabel;


  @FXML
  private ListView<String> playersListView;

  @FXML
  private Button continueButton;

  public void setPartida(Partida partida) {
    this.partida = partida;
    initializeData();
  }

  private void initializeData() {
    int rondaActual = partida.getRondaActual();
    int rondaTotal = partida.getnRondes();
    TipusRonda roundType = partida.getTipusRonda();
    Vector<Jugador> jugadors = partida.getJugadors();

    roundNumberLabel.setText("Número de ronda: " + rondaActual + "/" + rondaTotal);
    roundTypeLabel.setText("Tipus de ronda: " + roundType.toLocalizedString());

    // Nombre de cartes per a aquesta ronda
    int numCartes = jugadors.get(0).getnCartes();
    roundCardsLabel.setText("Número de cartes: " + numCartes);

    playersListView.getItems().clear();
    for (int i = 0; i < jugadors.size(); i++) {
      String playerInfo = jugadors.get(i).getNom()
          + " - Puntuació: " + jugadors.get(i).getPuntuacioTotal()
          + " - Aposta: " + jugadors.get(i).getApostaActual();
      playersListView.getItems().add(playerInfo);
    }
  }

  @FXML
  private void onContinueClick() {
    try {
      FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("new-round-view.fxml"));
      Scene scene = new Scene(fxmlLoader.load(), 400, 300);

      NewRoundController controller = fxmlLoader.getController();
      controller.setPartida(partida);

      Stage stage = (Stage) continueButton.getScene().getWindow();
      stage.setScene(scene);

    } catch (IOException e) {
      System.err.println("Error al carregar la vista de nova ronda: " + e.getMessage());
      e.printStackTrace();
    }
  }
}
