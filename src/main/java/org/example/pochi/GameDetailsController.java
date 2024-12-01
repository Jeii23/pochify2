package org.example.pochi;

import org.example.pochi.backend.Jugador;
import org.example.pochi.backend.Partida;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.stage.Stage;
import org.example.pochi.backend.TipusRonda;

import java.io.IOException;
import java.util.Vector;

public class GameDetailsController {

  private Partida partida; // Referencia a la instancia de partida

  @FXML
  private Label roundNumberLabel;

  @FXML
  private Label roundTypeLabel;

  @FXML
  private ListView<String> playersListView;

  @FXML
  private Button finalizeRoundButton;



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


    for (int i = 0; i < jugadors.size(); i++) {
      String playerInfo = jugadors.get(i).getNom()
          + " - Puntuació: " + jugadors.get(i).getPuntuacioTotal()
          + " - Aposta: " + jugadors.get(i).getApostaActual();
      playersListView.getItems().add(playerInfo);
    }
  }

  @FXML
  private void onFinalizeRoundClick() throws IOException {
    FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("finalize-round-view.fxml"));
    Scene scene = new Scene(fxmlLoader.load(), 500, 600);

    FinalizeRoundController controller = fxmlLoader.getController();
    controller.setPartida(partida); // Pasar instancia de partida

    Stage stage = (Stage) finalizeRoundButton.getScene().getWindow();
    stage.setScene(scene);
  }
}
