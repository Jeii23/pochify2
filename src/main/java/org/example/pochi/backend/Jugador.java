public class Jugador {
    private String nom;
    private int puntuacioTotal;
    private int apostaActual;
    private int puntuacioRonda;
    private int nCartes;

    // Constructor
    public Jugador(String nom) {
        this.nom =nom;
        this.puntuacioTotal = 0;
        this.apostaActual = 0;
        this.puntuacioRonda = 0;
        this.nCartes=0;
    }

    public String getNom() {
        return nom;
    }

    public int getApostaActual() {
        return apostaActual;
    }

    public void setApostaActual(int apostaActual) {
        this.apostaActual = apostaActual;
    }

    public void setnCartes(int nCartes) {
        this.nCartes = nCartes;
    }
    public int getnCartes(){
        return nCartes;
    }
    public int getPuntuacioTotal(){
        return puntuacioTotal;
    }



    public void setNom(String nom){
        this.nom=nom;
    }










}
