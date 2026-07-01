import XCTest
@testable import PochifyCore

final class GameEngineTests: XCTestCase {
    func testTotalCardCalculation() {
        XCTAssertEqual(GameEngine.calculateTotalCards(playerCount: 3), 36)
        XCTAssertEqual(GameEngine.calculateTotalCards(playerCount: 4), 40)
        XCTAssertEqual(GameEngine.calculateTotalCards(playerCount: 5), 40)
    }

    func testTotalRoundCalculation() {
        XCTAssertEqual(GameEngine.calculateTotalRounds(playerCount: 3), 28)
        XCTAssertEqual(GameEngine.calculateTotalRounds(playerCount: 4), 32)
        XCTAssertEqual(GameEngine.calculateTotalRounds(playerCount: 5), 36)
    }

    func testPlayerOrderRotation() throws {
        var engine = try GameEngine(playerCount: 3)
        let firstRound = try engine.beginNextRound()
        let firstOrder = firstRound.playerOrderIDs.compactMap { engine.player(id: $0)?.name }

        XCTAssertEqual(firstOrder, ["Player 1", "Player 2", "Player 3"])

        try engine.setBid(playerID: firstRound.playerOrderIDs[0], bid: 1)
        try engine.setBid(playerID: firstRound.playerOrderIDs[1], bid: 0)
        try engine.setBid(playerID: firstRound.playerOrderIDs[2], bid: 1)
        try engine.completeRound(
            tricksByPlayerID: [
                firstRound.playerOrderIDs[0]: 1,
                firstRound.playerOrderIDs[1]: 0,
                firstRound.playerOrderIDs[2]: 0
            ]
        )

        let secondRound = try engine.beginNextRound()
        let secondOrder = secondRound.playerOrderIDs.compactMap { engine.player(id: $0)?.name }

        XCTAssertEqual(secondOrder, ["Player 2", "Player 3", "Player 1"])
    }

    func testLastPlayerBidRule() throws {
        var engine = try GameEngine(playerCount: 3)
        let round = try engine.beginNextRound()

        try engine.setBid(playerID: round.playerOrderIDs[0], bid: 0)
        try engine.setBid(playerID: round.playerOrderIDs[1], bid: 0)

        XCTAssertFalse(engine.isBidAllowed(playerID: round.playerOrderIDs[2], bid: 1))
        XCTAssertTrue(engine.isBidAllowed(playerID: round.playerOrderIDs[2], bid: 0))
        XCTAssertThrowsError(try engine.setBid(playerID: round.playerOrderIDs[2], bid: 1))
    }

    func testNormalScoringWhenBidIsCorrect() {
        XCTAssertEqual(
            Player.scoreDelta(roundType: .basic, bid: 2, tricksWon: 2),
            20
        )
    }

    func testNormalScoringWhenBidIsWrong() {
        XCTAssertEqual(
            Player.scoreDelta(roundType: .subasta, bid: 3, tricksWon: 1),
            -10
        )
    }

    func testOrosDoblesScoringWhenBidIsCorrect() {
        XCTAssertEqual(
            Player.scoreDelta(roundType: .orosDobles, bid: 2, tricksWon: 2),
            40
        )
    }

    func testOrosDoblesScoringWhenBidIsWrong() {
        XCTAssertEqual(
            Player.scoreDelta(roundType: .orosDobles, bid: 3, tricksWon: 1),
            -20
        )
    }

    func testRoundTypeProgression() throws {
        let engine = try GameEngine(playerCount: 3)

        XCTAssertEqual(engine.roundType(for: 1), .basic)
        XCTAssertEqual(engine.roundType(for: 13), .basic)
        XCTAssertEqual(engine.roundType(for: 14), .sinPalo)
        XCTAssertEqual(engine.roundType(for: 17), .subasta)
        XCTAssertEqual(engine.roundType(for: 20), .dado)
        XCTAssertEqual(engine.roundType(for: 23), .manoPinta)
        XCTAssertEqual(engine.roundType(for: 26), .orosDobles)
        XCTAssertEqual(engine.roundType(for: 28), .orosDobles)
    }

    func testEndOfGameCondition() throws {
        var engine = try GameEngine(playerCount: 3)

        for _ in 0..<engine.totalRounds {
            let round = try engine.beginNextRound()

            for playerID in round.playerOrderIDs {
                try engine.setBid(playerID: playerID, bid: 0)
            }

            var tricks = Dictionary(uniqueKeysWithValues: engine.players.map { ($0.id, 0) })
            tricks[round.playerOrderIDs[0]] = round.cardsPerPlayer

            try engine.completeRound(tricksByPlayerID: tricks)
        }

        XCTAssertTrue(engine.isFinished)
        XCTAssertThrowsError(try engine.beginNextRound())
    }
}
