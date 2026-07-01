import Foundation

public struct Player: Identifiable, Codable, Equatable {
    public let id: UUID
    public var name: String
    public var totalScore: Int
    public var currentBid: Int
    public var lastTricksWon: Int
    public var cardsInHand: Int

    public init(
        id: UUID = UUID(),
        name: String,
        totalScore: Int = 0,
        currentBid: Int = 0,
        lastTricksWon: Int = 0,
        cardsInHand: Int = 0
    ) {
        self.id = id
        self.name = name
        self.totalScore = totalScore
        self.currentBid = currentBid
        self.lastTricksWon = lastTricksWon
        self.cardsInHand = cardsInHand
    }

    public mutating func resetForRound(cards: Int) {
        currentBid = 0
        lastTricksWon = 0
        cardsInHand = cards
    }

    @discardableResult
    public mutating func applyScore(roundType: RoundType, tricksWon: Int) -> Int {
        let delta = Self.scoreDelta(
            roundType: roundType,
            bid: currentBid,
            tricksWon: tricksWon
        )
        totalScore += delta
        lastTricksWon = tricksWon
        return delta
    }

    public static func scoreDelta(roundType: RoundType, bid: Int, tricksWon: Int) -> Int {
        let isDoubleGold = roundType == .orosDobles
        if tricksWon == bid {
            return isDoubleGold ? 20 + 10 * tricksWon : 10 + 5 * tricksWon
        }

        let miss = abs(tricksWon - bid)
        return isDoubleGold ? -10 * miss : -5 * miss
    }

    public static func defaultPlayers(count: Int) -> [Player] {
        (1...count).map { Player(name: "Player \($0)") }
    }
}
