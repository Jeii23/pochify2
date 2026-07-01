import Foundation

public enum RoundType: String, CaseIterable, Codable, Equatable {
    case basic = "BASIC"
    case sinPalo = "SIN_PALO"
    case subasta = "SUBASTA"
    case dado = "DADO"
    case manoPinta = "MANO_PINTA"
    case orosDobles = "OROS_DOBLES"

    public var displayName: String {
        switch self {
        case .basic:
            return "Basic"
        case .sinPalo:
            return "Sin palo"
        case .subasta:
            return "Subasta"
        case .dado:
            return "Dado"
        case .manoPinta:
            return "Mano pinta"
        case .orosDobles:
            return "Oros dobles"
        }
    }
}
