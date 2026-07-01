(function (root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.PochifyCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const ROUND_TYPES = {
        basic: "BASIC",
        sinPalo: "SIN_PALO",
        subasta: "SUBASTA",
        dado: "DADO",
        manoPinta: "MANO_PINTA",
        orosDobles: "OROS_DOBLES"
    };

    const ROUND_TYPE_LABELS = {
        [ROUND_TYPES.basic]: "Basic",
        [ROUND_TYPES.sinPalo]: "Sin palo",
        [ROUND_TYPES.subasta]: "Subasta",
        [ROUND_TYPES.dado]: "Dado",
        [ROUND_TYPES.manoPinta]: "Mano pinta",
        [ROUND_TYPES.orosDobles]: "Oros dobles"
    };

    const SUPPORTED_PLAYER_COUNTS = [3, 4, 5];

    function createID() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    function defaultPlayers(count) {
        return Array.from({ length: count }, (_, index) => ({
            id: createID(),
            name: `Player ${index + 1}`,
            totalScore: 0,
            currentBid: 0,
            lastTricksWon: 0,
            cardsInHand: 0
        }));
    }

    function scoreDelta(roundType, bid, tricksWon) {
        const isDoubleGold = roundType === ROUND_TYPES.orosDobles;

        if (tricksWon === bid) {
            return isDoubleGold ? 20 + 10 * tricksWon : 10 + 5 * tricksWon;
        }

        const miss = Math.abs(tricksWon - bid);
        return isDoubleGold ? -10 * miss : -5 * miss;
    }

    function resetPlayerForRound(player, cards) {
        player.currentBid = 0;
        player.lastTricksWon = 0;
        player.cardsInHand = cards;
    }

    function applyScore(player, roundType, tricksWon) {
        const delta = scoreDelta(roundType, player.currentBid, tricksWon);
        player.totalScore += delta;
        player.lastTricksWon = tricksWon;
        return delta;
    }

    function getValueByPlayerID(values, playerID) {
        if (values instanceof Map) {
            return values.get(playerID);
        }

        return values[playerID];
    }

    class GameEngine {
        constructor(playerCount) {
            if (!SUPPORTED_PLAYER_COUNTS.includes(playerCount)) {
                throw new Error(`Pochify supports 3, 4, or 5 players, not ${playerCount}.`);
            }

            const totalCards = GameEngine.calculateTotalCards(playerCount);

            this.players = defaultPlayers(playerCount);
            this.totalCards = totalCards;
            this.totalRounds = GameEngine.calculateTotalRounds(playerCount, totalCards);
            this.currentRound = 0;
            this.startingPlayerIndex = 0;
            this.activeRound = null;
            this.lastRoundResults = [];
        }

        static fromSnapshot(snapshot) {
            const engine = Object.create(GameEngine.prototype);
            engine.players = Array.isArray(snapshot.players) ? snapshot.players : [];
            engine.totalCards = snapshot.totalCards;
            engine.totalRounds = snapshot.totalRounds;
            engine.currentRound = snapshot.currentRound;
            engine.startingPlayerIndex = snapshot.startingPlayerIndex;
            engine.activeRound = snapshot.activeRound || null;
            engine.lastRoundResults = Array.isArray(snapshot.lastRoundResults)
                ? snapshot.lastRoundResults
                : [];
            return engine;
        }

        static calculateTotalCards(playerCount) {
            let totalCards = 40;

            while (totalCards % playerCount !== 0) {
                totalCards -= 2;
            }

            return totalCards;
        }

        static calculateTotalRounds(playerCount, totalCards) {
            const cards = totalCards || GameEngine.calculateTotalCards(playerCount);
            return playerCount + playerCount * 5 + cards / playerCount - 2;
        }

        get playerCount() {
            return this.players.length;
        }

        get isFinished() {
            return this.currentRound >= this.totalRounds && this.activeRound === null;
        }

        get ranking() {
            return [...this.players].sort((first, second) => {
                if (first.totalScore !== second.totalScore) {
                    return second.totalScore - first.totalScore;
                }

                return first.name.localeCompare(second.name, undefined, {
                    numeric: true,
                    sensitivity: "base"
                });
            });
        }

        get currentPlayerOrder() {
            const orderIDs = this.activeRound
                ? this.activeRound.playerOrderIDs
                : this.playerOrderIDs(this.startingPlayerIndex);

            return orderIDs.map((playerID) => this.player(playerID)).filter(Boolean);
        }

        toSnapshot() {
            return {
                players: this.players,
                totalCards: this.totalCards,
                totalRounds: this.totalRounds,
                currentRound: this.currentRound,
                startingPlayerIndex: this.startingPlayerIndex,
                activeRound: this.activeRound,
                lastRoundResults: this.lastRoundResults
            };
        }

        updatePlayerNames(names) {
            this.players.forEach((player, index) => {
                if (index >= names.length) {
                    return;
                }

                const trimmedName = names[index].trim();
                if (trimmedName.length > 0) {
                    player.name = trimmedName;
                }
            });
        }

        beginNextRound() {
            if (this.activeRound) {
                return this.activeRound;
            }

            if (this.currentRound >= this.totalRounds) {
                throw new Error("The game is already finished.");
            }

            const roundNumber = this.currentRound + 1;
            const summary = this.makeRoundSummary(roundNumber);

            this.currentRound = roundNumber;
            this.activeRound = summary;
            this.lastRoundResults = [];
            this.players.forEach((player) => resetPlayerForRound(player, summary.cardsPerPlayer));

            return summary;
        }

        setBid(playerID, bid) {
            const message = this.bidValidationMessage(playerID, bid);

            if (message) {
                throw new Error(message);
            }

            const player = this.player(playerID);
            if (!player) {
                throw new Error("Player not found.");
            }

            player.currentBid = bid;
        }

        isBidAllowed(playerID, bid) {
            return this.bidValidationMessage(playerID, bid) === null;
        }

        bidValidationMessage(playerID, bid) {
            if (!this.activeRound) {
                return "Start a round before bidding.";
            }

            if (!this.players.some((player) => player.id === playerID)) {
                return "Player not found.";
            }

            if (!Number.isInteger(bid) || bid < 0 || bid > this.activeRound.cardsPerPlayer) {
                return `Bid between 0 and ${this.activeRound.cardsPerPlayer}.`;
            }

            const orderIndex = this.activeRound.playerOrderIDs.indexOf(playerID);
            if (orderIndex === -1) {
                return "Player is not in this round.";
            }

            if (orderIndex === this.activeRound.playerOrderIDs.length - 1) {
                const total = this.activeRound.playerOrderIDs.reduce((partial, id) => {
                    if (id === playerID) {
                        return partial + bid;
                    }

                    const player = this.player(id);
                    return partial + (player ? player.currentBid : 0);
                }, 0);

                if (total === this.activeRound.cardsPerPlayer) {
                    return `The last bid cannot make total bids equal ${this.activeRound.cardsPerPlayer}.`;
                }
            }

            return null;
        }

        completeRound(tricksByPlayerID) {
            if (!this.activeRound) {
                throw new Error("There is no active round.");
            }

            let totalTricks = 0;

            for (const player of this.players) {
                const tricks = getValueByPlayerID(tricksByPlayerID, player.id);

                if (!Number.isInteger(tricks)) {
                    throw new Error("Enter tricks won for every player.");
                }

                if (tricks < 0 || tricks > this.activeRound.cardsPerPlayer) {
                    throw new Error(`Tricks won must be between 0 and ${this.activeRound.cardsPerPlayer}.`);
                }

                totalTricks += tricks;
            }

            if (totalTricks !== this.activeRound.cardsPerPlayer) {
                throw new Error(`Total tricks won must equal ${this.activeRound.cardsPerPlayer}.`);
            }

            const results = this.players.map((player) => {
                const tricks = getValueByPlayerID(tricksByPlayerID, player.id);
                const bid = player.currentBid;
                const delta = applyScore(player, this.activeRound.roundType, tricks);

                return {
                    playerID: player.id,
                    playerName: player.name,
                    bid,
                    tricksWon: tricks,
                    scoreDelta: delta,
                    totalScore: player.totalScore
                };
            });

            this.lastRoundResults = results;
            this.activeRound = null;
            this.startingPlayerIndex = (this.startingPlayerIndex + 1) % this.playerCount;

            return results;
        }

        player(playerID) {
            return this.players.find((candidate) => candidate.id === playerID) || null;
        }

        playerOrderIDs(startIndex) {
            if (this.players.length === 0) {
                return [];
            }

            return Array.from({ length: this.players.length }, (_, offset) => {
                return this.players[(startIndex + offset) % this.players.length].id;
            });
        }

        makeRoundSummary(roundNumber) {
            const orderIDs = this.playerOrderIDs(this.startingPlayerIndex);

            return {
                roundNumber,
                totalRounds: this.totalRounds,
                roundType: this.roundType(roundNumber),
                cardsPerPlayer: this.cardsPerPlayer(roundNumber),
                startingPlayerID: orderIDs[0],
                playerOrderIDs: orderIDs
            };
        }

        cardsPerPlayer(roundNumber) {
            const roundType = this.roundType(roundNumber);

            if (roundNumber <= this.playerCount) {
                return 1;
            }

            if (roundType !== ROUND_TYPES.basic) {
                return this.totalCards / this.playerCount;
            }

            return roundNumber - this.playerCount + 1;
        }

        roundType(roundNumber) {
            const firstSpecialRoundBase = this.totalRounds - 5 * this.playerCount;

            if (firstSpecialRoundBase >= roundNumber) {
                return ROUND_TYPES.basic;
            }

            const specialOffset = roundNumber - firstSpecialRoundBase;

            if (specialOffset <= this.playerCount) {
                return ROUND_TYPES.sinPalo;
            }

            if (specialOffset <= 2 * this.playerCount) {
                return ROUND_TYPES.subasta;
            }

            if (specialOffset <= 3 * this.playerCount) {
                return ROUND_TYPES.dado;
            }

            if (specialOffset <= 4 * this.playerCount) {
                return ROUND_TYPES.manoPinta;
            }

            return ROUND_TYPES.orosDobles;
        }
    }

    return {
        GameEngine,
        ROUND_TYPES,
        ROUND_TYPE_LABELS,
        defaultPlayers,
        scoreDelta
    };
});
