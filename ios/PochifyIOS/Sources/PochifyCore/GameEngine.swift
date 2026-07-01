import Foundation

public enum GameEngineError: Error, Equatable {
    case unsupportedPlayerCount(Int)
    case gameFinished
    case noActiveRound
    case unknownPlayer
    case invalidBid(String)
    case invalidTricks(String)
}

extension GameEngineError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .unsupportedPlayerCount(let count):
            return "Pochify supports 3, 4, or 5 players, not \(count)."
        case .gameFinished:
            return "The game is already finished."
        case .noActiveRound:
            return "There is no active round."
        case .unknownPlayer:
            return "Player not found."
        case .invalidBid(let message), .invalidTricks(let message):
            return message
        }
    }
}

public struct GameEngine: Codable, Equatable {
    public private(set) var players: [Player]
    public private(set) var totalCards: Int
    public private(set) var totalRounds: Int
    public private(set) var currentRound: Int
    public private(set) var startingPlayerIndex: Int
    public private(set) var activeRound: RoundSummary?
    public private(set) var lastRoundResults: [RoundResult]

    public init(playerCount: Int) throws {
        guard [3, 4, 5].contains(playerCount) else {
            throw GameEngineError.unsupportedPlayerCount(playerCount)
        }

        let totalCards = Self.calculateTotalCards(playerCount: playerCount)
        self.players = Player.defaultPlayers(count: playerCount)
        self.totalCards = totalCards
        self.totalRounds = Self.calculateTotalRounds(
            playerCount: playerCount,
            totalCards: totalCards
        )
        self.currentRound = 0
        self.startingPlayerIndex = 0
        self.activeRound = nil
        self.lastRoundResults = []
    }

    public var playerCount: Int {
        players.count
    }

    public var isFinished: Bool {
        currentRound >= totalRounds && activeRound == nil
    }

    public var ranking: [Player] {
        players.sorted { first, second in
            if first.totalScore != second.totalScore {
                return first.totalScore > second.totalScore
            }
            return first.name.localizedStandardCompare(second.name) == .orderedAscending
        }
    }

    public var currentPlayerOrder: [Player] {
        let orderIDs = activeRound?.playerOrderIDs ?? playerOrderIDs(startingAt: startingPlayerIndex)
        return orderIDs.compactMap(player)
    }

    public mutating func updatePlayerNames(_ names: [String]) {
        for index in players.indices {
            guard index < names.count else { continue }
            let trimmedName = names[index].trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedName.isEmpty {
                players[index].name = trimmedName
            }
        }
    }

    @discardableResult
    public mutating func beginNextRound() throws -> RoundSummary {
        if let activeRound {
            return activeRound
        }

        guard currentRound < totalRounds else {
            throw GameEngineError.gameFinished
        }

        let roundNumber = currentRound + 1
        let summary = makeRoundSummary(roundNumber: roundNumber)

        currentRound = roundNumber
        activeRound = summary
        lastRoundResults = []

        for index in players.indices {
            players[index].resetForRound(cards: summary.cardsPerPlayer)
        }

        return summary
    }

    public mutating func setBid(playerID: UUID, bid: Int) throws {
        if let message = bidValidationMessage(playerID: playerID, bid: bid) {
            throw GameEngineError.invalidBid(message)
        }

        guard let index = players.firstIndex(where: { $0.id == playerID }) else {
            throw GameEngineError.unknownPlayer
        }

        players[index].currentBid = bid
    }

    public func isBidAllowed(playerID: UUID, bid: Int) -> Bool {
        bidValidationMessage(playerID: playerID, bid: bid) == nil
    }

    public func bidValidationMessage(playerID: UUID, bid: Int) -> String? {
        guard let activeRound else {
            return "Start a round before bidding."
        }

        guard players.contains(where: { $0.id == playerID }) else {
            return "Player not found."
        }

        guard (0...activeRound.cardsPerPlayer).contains(bid) else {
            return "Bid between 0 and \(activeRound.cardsPerPlayer)."
        }

        guard let orderIndex = activeRound.playerOrderIDs.firstIndex(of: playerID) else {
            return "Player is not in this round."
        }

        if orderIndex == activeRound.playerOrderIDs.count - 1 {
            let total = activeRound.playerOrderIDs.reduce(0) { partial, id in
                if id == playerID {
                    return partial + bid
                }
                return partial + (player(id: id)?.currentBid ?? 0)
            }

            if total == activeRound.cardsPerPlayer {
                return "The last bid cannot make total bids equal \(activeRound.cardsPerPlayer)."
            }
        }

        return nil
    }

    @discardableResult
    public mutating func completeRound(tricksByPlayerID: [UUID: Int]) throws -> [RoundResult] {
        guard let activeRound else {
            throw GameEngineError.noActiveRound
        }

        var totalTricks = 0
        for player in players {
            guard let tricks = tricksByPlayerID[player.id] else {
                throw GameEngineError.invalidTricks("Enter tricks won for every player.")
            }
            guard (0...activeRound.cardsPerPlayer).contains(tricks) else {
                throw GameEngineError.invalidTricks(
                    "Tricks won must be between 0 and \(activeRound.cardsPerPlayer)."
                )
            }
            totalTricks += tricks
        }

        guard totalTricks == activeRound.cardsPerPlayer else {
            throw GameEngineError.invalidTricks(
                "Total tricks won must equal \(activeRound.cardsPerPlayer)."
            )
        }

        var results: [RoundResult] = []
        for index in players.indices {
            let playerID = players[index].id
            let tricks = tricksByPlayerID[playerID] ?? 0
            let bid = players[index].currentBid
            let delta = players[index].applyScore(
                roundType: activeRound.roundType,
                tricksWon: tricks
            )

            results.append(
                RoundResult(
                    playerID: playerID,
                    playerName: players[index].name,
                    bid: bid,
                    tricksWon: tricks,
                    scoreDelta: delta,
                    totalScore: players[index].totalScore
                )
            )
        }

        lastRoundResults = results
        self.activeRound = nil
        startingPlayerIndex = (startingPlayerIndex + 1) % playerCount

        return results
    }

    public func player(id: UUID) -> Player? {
        players.first { $0.id == id }
    }

    public func playerOrderIDs(startingAt startIndex: Int) -> [UUID] {
        guard !players.isEmpty else { return [] }
        return (0..<players.count).map { offset in
            players[(startIndex + offset) % players.count].id
        }
    }

    public func makeRoundSummary(roundNumber: Int) -> RoundSummary {
        let orderIDs = playerOrderIDs(startingAt: startingPlayerIndex)
        return RoundSummary(
            roundNumber: roundNumber,
            totalRounds: totalRounds,
            roundType: roundType(for: roundNumber),
            cardsPerPlayer: cardsPerPlayer(for: roundNumber),
            startingPlayerID: orderIDs[0],
            playerOrderIDs: orderIDs
        )
    }

    public func cardsPerPlayer(for roundNumber: Int) -> Int {
        let roundType = roundType(for: roundNumber)
        if roundNumber <= playerCount {
            return 1
        }
        if roundType != .basic {
            return totalCards / playerCount
        }
        return roundNumber - playerCount + 1
    }

    public func roundType(for roundNumber: Int) -> RoundType {
        let firstSpecialRoundBase = totalRounds - 5 * playerCount
        guard firstSpecialRoundBase < roundNumber else {
            return .basic
        }

        let specialOffset = roundNumber - firstSpecialRoundBase
        if specialOffset <= playerCount {
            return .sinPalo
        } else if specialOffset <= 2 * playerCount {
            return .subasta
        } else if specialOffset <= 3 * playerCount {
            return .dado
        } else if specialOffset <= 4 * playerCount {
            return .manoPinta
        } else {
            return .orosDobles
        }
    }

    public static func calculateTotalCards(playerCount: Int) -> Int {
        var totalCards = 40
        while totalCards % playerCount != 0 {
            totalCards -= 2
        }
        return totalCards
    }

    public static func calculateTotalRounds(playerCount: Int, totalCards: Int? = nil) -> Int {
        let cards = totalCards ?? calculateTotalCards(playerCount: playerCount)
        return playerCount + playerCount * 5 + (cards / playerCount) - 2
    }
}
