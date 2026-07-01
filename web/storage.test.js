const assert = require("node:assert/strict");
const storageApi = require("./storage.js");

function makeStorage() {
    const values = new Map();

    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        }
    };
}

function savePayload(name) {
    return {
        version: 1,
        savedAt: "2026-07-01T13:00:00Z",
        state: {
            phase: "bidding",
            selectedPlayerCount: 3,
            playerNames: [name, "Player 2", "Player 3"],
            engine: {
                players: [{ id: "p1", name }],
                totalCards: 36,
                totalRounds: 28,
                currentRound: 1,
                startingPlayerIndex: 0,
                activeRound: { roundNumber: 1 },
                lastRoundResults: []
            },
            activeRound: { roundNumber: 1 },
            biddingIndex: 0,
            bidDraft: 1,
            tricksDrafts: {}
        }
    };
}

function gameResult(gameID, winnerName, scores, roundDeltas) {
    const playerNames = ["M", "N", "J"];
    const finalScores = scores || {
        M: 10,
        N: winnerName === "N" ? 45 : 20,
        J: winnerName === "J" ? 50 : 15
    };
    const deltas = roundDeltas || {
        M: [-5, 10],
        N: [20, -10],
        J: [15, -15]
    };

    return {
        version: 1,
        gameID,
        finishedAt: "2026-07-01T14:00:00Z",
        players: playerNames.map((name) => ({
            id: name.toLowerCase(),
            name,
            totalScore: finalScores[name]
        })),
        rounds: [0, 1].map((roundIndex) => ({
            roundNumber: roundIndex + 1,
            roundType: "BASIC",
            cardsPerPlayer: 1,
            results: playerNames.map((name) => ({
                playerID: name.toLowerCase(),
                playerName: name,
                scoreDelta: deltas[name][roundIndex]
            }))
        }))
    };
}

function run() {
    const saveStorage = makeStorage();

    assert.equal(storageApi.loadLatestGame(saveStorage).payload, null);
    assert.equal(storageApi.saveLatestGame(savePayload("First"), saveStorage).ok, true);
    assert.equal(storageApi.saveLatestGame(savePayload("Second"), saveStorage).ok, true);
    assert.equal(storageApi.loadLatestGame(saveStorage).payload.state.playerNames[0], "Second");

    saveStorage.setItem(storageApi.LATEST_GAME_KEY, "{");
    assert.equal(storageApi.loadLatestGame(saveStorage).ok, false);

    storageApi.clearLatestGame(saveStorage);
    assert.equal(saveStorage.getItem(storageApi.LATEST_GAME_KEY), null);

    const rankingStorage = makeStorage();
    storageApi.recordFinishedGame(gameResult("game-1", "N"), rankingStorage);
    storageApi.recordFinishedGame(gameResult("game-2", "N"), rankingStorage);
    const thirdGame = storageApi.recordFinishedGame(gameResult("game-3", "J"), rankingStorage);

    assert.equal(thirdGame.ok, true);
    assert.equal(thirdGame.recorded, true);
    assert.equal(thirdGame.ranking.gamesRecorded, 3);

    const playersByName = Object.fromEntries(
        thirdGame.ranking.players.map((player) => [player.name, player])
    );

    assert.equal(playersByName.N.wins, 2);
    assert.equal(playersByName.J.wins, 1);
    assert.equal(playersByName.M.wins, 0);
    assert.equal(thirdGame.ranking.players[0].name, "N");

    const extremesStorage = makeStorage();
    const extremes = storageApi.recordFinishedGame(
        gameResult(
            "stats-game",
            "J",
            { M: -10, N: 30, J: 80 },
            {
                M: [-25, 10],
                N: [35, -5],
                J: [20, 40]
            }
        ),
        extremesStorage
    );
    const extremesByName = Object.fromEntries(
        extremes.ranking.players.map((player) => [player.name, player])
    );

    assert.equal(extremesByName.J.bestGameScore, 80);
    assert.equal(extremesByName.J.bestRoundGain, 40);
    assert.equal(extremesByName.M.worstRoundLoss, -25);
    assert.equal(extremesByName.N.roundsPlayed, 2);

    const duplicateStorage = makeStorage();
    storageApi.recordFinishedGame(gameResult("repeat-game", "N"), duplicateStorage);
    const duplicate = storageApi.recordFinishedGame(gameResult("repeat-game", "N"), duplicateStorage);
    const rawRanking = JSON.parse(duplicateStorage.getItem(storageApi.RANKING_KEY));

    assert.equal(duplicate.recorded, false);
    assert.equal(duplicate.ranking.gamesRecorded, 1);
    assert.equal(rawRanking.players.n.wins, 1);

    duplicateStorage.setItem(storageApi.RANKING_KEY, "{");
    const corruptedRanking = storageApi.loadRanking(duplicateStorage);
    assert.equal(corruptedRanking.ok, false);
    assert.deepEqual(corruptedRanking.ranking.players, []);

    storageApi.resetRanking(duplicateStorage);
    assert.equal(duplicateStorage.getItem(storageApi.RANKING_KEY), null);

    console.log("Pochify web storage tests passed.");
}

run();
