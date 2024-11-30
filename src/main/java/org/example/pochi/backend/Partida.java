package org.example.pochi.backend;

import java.util.Vector;
import java.util.Scanner;

public class Partida {

    private Vector<Jugador> jugadors;
    private int nJugadors;
    private int nRondes;
    private int rondaActual;
    private int cartesTotals;

    private int jugadorInicial;
    private TipusRonda tipusRonda;

    public Partida(int nJugadors)
    {
        jugadors=new Vector<>(nJugadors);
        inicialitzarJugadors(nJugadors);
        this.nJugadors=nJugadors;
        this.cartesTotals=calcularNCartes(nJugadors);
        this.nRondes=calcularNRondes(nJugadors);
        this.tipusRonda=TipusRonda.BASIC;
        this.rondaActual=1;
        this.jugadorInicial=1;
    }

    private void inicialitzarJugadors(int nJugadors) {
        for (int i = 1; i <= nJugadors; i++) {
            Jugador jugador = new Jugador("Jugador " + i);
            jugadors.add(jugador);
        }
    }
    public int calcularNCartes(int nJugadors)
    {
        int totalCards = 40;
        while (totalCards % nJugadors != 0) {
            totalCards-=2;
        }
        return totalCards;
    }

    public void setRondaActual(int rondaActual) {
        this.rondaActual = rondaActual;
    }

    public int calcularNRondes(int nJugadors){
        int rondes=nJugadors;

        rondes+=nJugadors*5;
        rondes+=(cartesTotals/nJugadors)-2;

        return rondes;
    }

    public int getRondaActual() {
        return rondaActual;
    }

    public int getnRondes() {
        return nRondes;
    }

    public int getnJugadors() {
        return nJugadors;
    }

    public void afegeixJugador(String nom)
    {
        int i=0;
        while ((jugadors.get(i).getNom()!="")&&i<nJugadors)
        {
            i++;
        }
        if(i!=nJugadors)
            jugadors.get(i).setNom(nom);
    }

    public void printJugadors(){
        System.out.println("Ronda: "+rondaActual);
        for (int i=0;i<nJugadors;i++)
            System.out.println(jugadors.get(i).getNom()+" "+jugadors.get(i).getApostaActual()+" "+jugadors.get(i).getPuntuacioTotal());
    }

    public void donarCartes(){
        calcularTipusRonda();
        int cartes=rondaActual-nJugadors+1;
        if (rondaActual<=nJugadors){
            cartes=1;
        }
        else if(this.tipusRonda!=TipusRonda.BASIC)
            cartes=cartesTotals/nJugadors;

        for (int i=0;i<jugadors.size();i++)
            jugadors.get(i).setnCartes(cartes);
    }

    private void calcularTipusRonda(){
        int calcul=nRondes-5*nJugadors;
        if(calcul<rondaActual)
        {
            calcul=rondaActual-calcul;
            if(calcul<=nJugadors)
                tipusRonda=TipusRonda.SIN_PALO;
            else if (calcul<=2*nJugadors) {
                tipusRonda=TipusRonda.SUBASTA;
            } else if (calcul<=3*nJugadors) {
                tipusRonda=TipusRonda.DADO;
            }
            else if (calcul<=4*nJugadors) {
                tipusRonda=TipusRonda.MANO_PINTA;
            }
            else
                tipusRonda=TipusRonda.OROS_DOBLES;
        }
    }

    public TipusRonda getTipusRonda() {
        return tipusRonda;
    }

    public Vector<Jugador> getJugadors() {
        return jugadors;
    }

    public int getJugadorInicial() {
        return jugadorInicial;
    }

    public int getJugadorFinal(){

        if(jugadorInicial<2)
            return 4;
        else
            return jugadorInicial-1;
    }

    public void jugarRonda()
    {
        donarCartes();
        int apostaTotal=0;
        for (int i=0;i<nJugadors;i++)
        {
            Scanner scanner= new Scanner(System.in);
            System.out.println("Aposta Jugador"+i);
            int aposta=scanner.nextInt();

            apostaTotal=apostaTotal+aposta;
            jugadors.get(i).setApostaActual(aposta);

            if(i==nJugadors-1&&apostaTotal==jugadors.get(i).getnCartes())
            {
                System.out.println("No pots fer aquest número d'apostes");
                aposta=scanner.nextInt();
            }
        }

        for (int i=0;i<nJugadors;i++) {
            Scanner scanner = new Scanner(System.in);
            System.out.println("Encerts Jugador"+i);
            int encerts = scanner.nextInt();
            jugadors.get(i).calcularPuntuacio(this.tipusRonda,encerts);
        }

        rondaActual++;
        calcularTipusRonda();
        jugadorInicial=(jugadorInicial+1)%nJugadors;
    }
}

