#if canImport(SwiftUI)
import SwiftUI
import PochifyCore

@MainActor
final class GameViewModel: ObservableObject {
    enum Phase {
        case welcome
        case playerNames
        case roundOverview
        case bidding
        case roundDetails
        case tricksInput
        case scores
        case finalRanking
    }

    @Published var phase: Phase = .welcome
    @Published var selectedPlayerCount = 3 {
        didSet {
            if phase == .welcome {
                playerNames = Self.defaultNames(count: selectedPlayerCount)
            }
        }
    }
    @Published var playerNames = Self.defaultNames(count: 3)
    @Published private(set) var engine: GameEngine?
    @Published var activeRound: RoundSummary?
    @Published var biddingIndex = 0
    @Published var bidDraft = 0
    @Published var tricksDrafts: [UUID: Int] = [:]
    @Published var errorMessage: String?
    @Published var roundResults: [RoundResult] = []

    var players: [Player] {
        engine?.players ?? []
    }

    var playerOrder: [Player] {
        guard let activeRound else { return [] }
        return activeRound.playerOrderIDs.compactMap { engine?.player(id: $0) }
    }

    var currentBiddingPlayer: Player? {
        guard biddingIndex < playerOrder.count else { return nil }
        return playerOrder[biddingIndex]
    }

    var currentTotalBids: Int {
        guard let activeRound else { return 0 }
        return activeRound.playerOrderIDs.reduce(0) { total, playerID in
            if playerID == currentBiddingPlayer?.id {
                return total + bidDraft
            }
            return total + (engine?.player(id: playerID)?.currentBid ?? 0)
        }
    }

    var currentBidValidationMessage: String? {
        guard let player = currentBiddingPlayer, let engine else { return nil }
        return engine.bidValidationMessage(playerID: player.id, bid: bidDraft)
    }

    var canConfirmBid: Bool {
        currentBidValidationMessage == nil
    }

    var totalTricksDraft: Int {
        tricksDrafts.values.reduce(0, +)
    }

    var canCompleteTricks: Bool {
        guard let activeRound else { return false }
        return totalTricksDraft == activeRound.cardsPerPlayer
    }

    var sortedScores: [Player] {
        engine?.ranking ?? []
    }

    func continueFromWelcome() {
        playerNames = Self.defaultNames(count: selectedPlayerCount)
        phase = .playerNames
    }

    func createGame() {
        do {
            var newEngine = try GameEngine(playerCount: selectedPlayerCount)
            newEngine.updatePlayerNames(playerNames)
            engine = newEngine
            try beginNextRound()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func beginNextRound() throws {
        guard var engine else { return }
        activeRound = try engine.beginNextRound()
        self.engine = engine
        biddingIndex = 0
        bidDraft = 0
        roundResults = []
        tricksDrafts = [:]
        phase = .roundOverview
    }

    func startBidding() {
        biddingIndex = 0
        bidDraft = currentBiddingPlayer?.currentBid ?? 0
        phase = .bidding
    }

    func confirmBid() {
        guard var engine, let player = currentBiddingPlayer else { return }

        do {
            try engine.setBid(playerID: player.id, bid: bidDraft)
            self.engine = engine
            biddingIndex += 1

            if biddingIndex >= playerOrder.count {
                phase = .roundDetails
            } else {
                bidDraft = currentBiddingPlayer?.currentBid ?? 0
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func prepareTricksInput() {
        tricksDrafts = Dictionary(uniqueKeysWithValues: players.map { player in
            (player.id, player.lastTricksWon)
        })
        phase = .tricksInput
    }

    func completeRound() {
        guard var engine else { return }

        do {
            roundResults = try engine.completeRound(tricksByPlayerID: tricksDrafts)
            self.engine = engine

            if engine.isFinished {
                phase = .finalRanking
            } else {
                phase = .scores
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func nextRound() {
        do {
            try beginNextRound()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func restart() {
        phase = .welcome
        selectedPlayerCount = 3
        playerNames = Self.defaultNames(count: 3)
        engine = nil
        activeRound = nil
        biddingIndex = 0
        bidDraft = 0
        tricksDrafts = [:]
        roundResults = []
        errorMessage = nil
    }

    func bindingForPlayerName(at index: Int) -> Binding<String> {
        Binding(
            get: { self.playerNames[index] },
            set: { self.playerNames[index] = $0 }
        )
    }

    func bindingForTricks(playerID: UUID) -> Binding<Int> {
        Binding(
            get: { self.tricksDrafts[playerID, default: 0] },
            set: { self.tricksDrafts[playerID] = $0 }
        )
    }

    func playerName(id: UUID) -> String {
        engine?.player(id: id)?.name ?? "Player"
    }

    static func defaultNames(count: Int) -> [String] {
        (1...count).map { "Player \($0)" }
    }
}
#endif
