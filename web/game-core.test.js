const assert = require("node:assert/strict");
const { GameEngine, ROUND_TYPES, scoreDelta } = require("./game-core.js");

function assertThrowsMessage(fn, message) {
    assert.throws(fn, (error) => error.message === message);
}

function run() {
    assert.equal(GameEngine.calculateTotalCards(3), 36);
    assert.equal(GameEngine.calculateTotalCards(4), 40);
    assert.equal(GameEngine.calculateTotalCards(5), 40);

    assert.equal(GameEngine.calculateTotalRounds(3), 28);
    assert.equal(GameEngine.calculateTotalRounds(4), 32);
    assert.equal(GameEngine.calculateTotalRounds(5), 36);

    const rotationEngine = new GameEngine(3, { random: () => 0 });
    const firstRound = rotationEngine.beginNextRound();
    const firstOrder = firstRound.playerOrderIDs.map((id) => rotationEngine.player(id).name);
    assert.deepEqual(firstOrder, ["Player 1", "Player 2", "Player 3"]);

    rotationEngine.setBid(firstRound.playerOrderIDs[0], 1);
    rotationEngine.setBid(firstRound.playerOrderIDs[1], 0);
    rotationEngine.setBid(firstRound.playerOrderIDs[2], 1);
    rotationEngine.completeRound({
        [firstRound.playerOrderIDs[0]]: 1,
        [firstRound.playerOrderIDs[1]]: 0,
        [firstRound.playerOrderIDs[2]]: 0
    });

    const secondRound = rotationEngine.beginNextRound();
    const secondOrder = secondRound.playerOrderIDs.map((id) => rotationEngine.player(id).name);
    assert.deepEqual(secondOrder, ["Player 2", "Player 3", "Player 1"]);

    const randomStartEngine = new GameEngine(3, { random: () => 0.72 });
    const randomStartRound = randomStartEngine.beginNextRound();
    const randomStartOrder = randomStartRound.playerOrderIDs.map((id) => randomStartEngine.player(id).name);
    assert.deepEqual(randomStartOrder, ["Player 3", "Player 1", "Player 2"]);

    const bidEngine = new GameEngine(3);
    const bidRound = bidEngine.beginNextRound();
    bidEngine.setBid(bidRound.playerOrderIDs[0], 0);
    bidEngine.setBid(bidRound.playerOrderIDs[1], 0);

    assert.equal(bidEngine.isBidAllowed(bidRound.playerOrderIDs[2], 1), false);
    assert.equal(bidEngine.isBidAllowed(bidRound.playerOrderIDs[2], 0), true);
    assertThrowsMessage(
        () => bidEngine.setBid(bidRound.playerOrderIDs[2], 1),
        "The last bid cannot make total bids equal 1."
    );

    assert.equal(scoreDelta(ROUND_TYPES.basic, 2, 2), 20);
    assert.equal(scoreDelta(ROUND_TYPES.subasta, 3, 1), -10);
    assert.equal(scoreDelta(ROUND_TYPES.orosDobles, 2, 2), 40);
    assert.equal(scoreDelta(ROUND_TYPES.orosDobles, 3, 1), -20);

    const typeEngine = new GameEngine(3);
    assert.equal(typeEngine.roundType(1), ROUND_TYPES.basic);
    assert.equal(typeEngine.roundType(13), ROUND_TYPES.basic);
    assert.equal(typeEngine.roundType(14), ROUND_TYPES.sinPalo);
    assert.equal(typeEngine.roundType(17), ROUND_TYPES.subasta);
    assert.equal(typeEngine.roundType(20), ROUND_TYPES.dado);
    assert.equal(typeEngine.roundType(23), ROUND_TYPES.manoPinta);
    assert.equal(typeEngine.roundType(26), ROUND_TYPES.orosDobles);
    assert.equal(typeEngine.roundType(28), ROUND_TYPES.orosDobles);

    const snapshot = GameEngine.fromSnapshot(typeEngine.toSnapshot());
    assert.equal(snapshot.totalRounds, typeEngine.totalRounds);
    assert.equal(snapshot.roundType(28), ROUND_TYPES.orosDobles);

    const finishEngine = new GameEngine(3);
    for (let index = 0; index < finishEngine.totalRounds; index += 1) {
        const round = finishEngine.beginNextRound();
        round.playerOrderIDs.forEach((playerID) => finishEngine.setBid(playerID, 0));

        const tricks = Object.fromEntries(finishEngine.players.map((player) => [player.id, 0]));
        tricks[round.playerOrderIDs[0]] = round.cardsPerPlayer;

        finishEngine.completeRound(tricks);
    }

    assert.equal(finishEngine.isFinished, true);
    assertThrowsMessage(() => finishEngine.beginNextRound(), "The game is already finished.");

    console.log("Pochify web core tests passed.");
}

run();
