package org.example.pochi;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;
import javafx.scene.image.Image;
import java.io.IOException;

public class GameApplication extends Application {
  @Override
  public void start(Stage stage) throws IOException {
    // Cargar la vista principal
    FXMLLoader fxmlLoader = new FXMLLoader(GameApplication.class.getResource("game-view.fxml"));
    Scene scene = new Scene(fxmlLoader.load(), 500, 600);

    // Configurar título e icono de la aplicación
    stage.setTitle("Pochify");
    stage.getIcons().add(new Image(GameApplication.class.getResourceAsStream("/org/example/pochi/icon.png"))); // Ruta del icono
    stage.setScene(scene);

    // Mostrar la ventana
    stage.show();
  }

  public static void main(String[] args) {
    launch();
  }
}
