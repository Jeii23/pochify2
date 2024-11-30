package org.example.pochi.backend;

public enum TipusRonda {
    SIN_PALO,
    SUBASTA,
    DADO,
    MANO_PINTA,
    OROS_DOBLES,
    BASIC;

    // Método para traducir el enum a texto
    public String toLocalizedString() {
        switch (this) {
            case SIN_PALO:
                return "Sin palo";
            case SUBASTA:
                return "Subasta";
            case DADO:
                return "Dado";
            case MANO_PINTA:
                return "Mano pinta";
            case OROS_DOBLES:
                return "Oros dobles";
            case BASIC:
                return "Básico";
            default:
                return "Desconocido";
        }
    }
}
