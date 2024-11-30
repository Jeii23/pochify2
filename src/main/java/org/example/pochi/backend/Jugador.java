package org.example.pochi.backend;

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

    public void calcularPuntuacio(TipusRonda tipus, int encerts) {
        if (encerts == apostaActual) {
            if (tipus != TipusRonda.OROS_DOBLES) {
                puntuacioTotal += 10 + 5 * encerts;
            } else
                puntuacioTotal += 20 + 10 * encerts;
        } else {
            if (tipus != TipusRonda.OROS_DOBLES) {
                puntuacioTotal -= 5 *  Math.abs(encerts-apostaActual);
            } else
                puntuacioTotal -= 10 * Math.abs(encerts-apostaActual);
        }
    }






}
