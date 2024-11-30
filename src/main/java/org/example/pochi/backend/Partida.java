import java.util.Vector;
import java.util.Scanner;

public class Partida {

    private Vector<Jugador> jugadors;
    private int nJugadors;
    private int nRondes;
    private int rondaActual;
    private int cartesTotals;

    private TipusRonda tipusRonda;

    public Partida(int nJugadors)
    {
        jugadors=new Vector<>(nJugadors);
        inicialitzarJugadors(nJugadors);
        this.nJugadors=nJugadors;
        this.cartesTotals=calcularNCartes(nJugadors);
        this.nRondes=calcularNRondes(nJugadors);
        this.tipusRonda=TipusRonda.BASIC;
        this.rondaActual=16;
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
        for (int i=0;i<nJugadors;i++)
            System.out.println(jugadors.get(i).getNom()+" "+jugadors.get(i).getnCartes()+" "+this.tipusRonda);
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

    public void jugarRonda()
    {
        Scanner scanner = new Scanner(System.in);
        for (int i=0;i<nJugadors;i++)
        {
            int aposta= scanner.nextInt();
            jugadors.get(i).setApostaActual(aposta);
        }
        
    }
}
