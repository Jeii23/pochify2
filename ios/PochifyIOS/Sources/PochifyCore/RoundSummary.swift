import Foundation

public struct RoundSummary: Identifiable, Codable, Equatable {
    public var id: Int { roundNumber }

    public let roundNumber: Int
    public let totalRounds: Int
    public let roundType: RoundType
    public let cardsPerPlayer: Int
    public let startingPlayerID: UUID
    public let playerOrderIDs: [UUID]

    public init(
        roundNumber: Int,
        totalRounds: Int,
        roundType: RoundType,
        cardsPerPlayer: Int,
        startingPlayerID: UUID,
        playerOrderIDs: [UUID]
    ) {
        self.roundNumber = roundNumber
        self.totalRounds = totalRounds
        self.roundType = roundType
        self.cardsPerPlayer = cardsPerPlayer
        self.startingPlayerID = startingPlayerID
        self.playerOrderIDs = playerOrderIDs
    }
}

public struct RoundResult: Identifiable, Codable, Equatable {
    public var id: UUID { playerID }

    public let playerID: UUID
    public let playerName: String
    public let bid: Int
    public let tricksWon: Int
    public let scoreDelta: Int
    public let totalScore: Int

    public init(
        playerID: UUID,
        playerName: String,
        bid: Int,
        tricksWon: Int,
        scoreDelta: Int,
        totalScore: Int
    ) {
        self.playerID = playerID
        self.playerName = playerName
        self.bid = bid
        self.tricksWon = tricksWon
        self.scoreDelta = scoreDelta
        self.totalScore = totalScore
    }
}
