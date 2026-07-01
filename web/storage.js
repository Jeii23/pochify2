(function (root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.PochifyStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const LATEST_GAME_KEY = "pochify.latestGame";
    const RANKING_KEY = "pochify.ranking";
    const STORAGE_UNAVAILABLE = "Browser storage is unavailable.";

    function storageFrom(storage) {
        if (storage) {
            return storage;
        }

        try {
            return typeof globalThis !== "undefined" ? globalThis.localStorage : null;
        } catch (error) {
            return null;
        }
    }

    function isObject(value) {
        return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    }

    function normalizePlayerName(name) {
        if (typeof name !== "string") {
            return "Player";
        }

        const normalized = name.trim().split(/\s+/).filter(Boolean).join(" ");
        return normalized || "Player";
    }

    function playerKey(name) {
        return normalizePlayerName(name).toLocaleLowerCase();
    }

    function updateOptionalMax(current, candidate) {
        return Number.isInteger(current) ? Math.max(current, candidate) : candidate;
    }

    function updateOptionalMin(current, candidate) {
        return Number.isInteger(current) ? Math.min(current, candidate) : candidate;
    }

    function integerOr(value, fallback) {
        return Number.isInteger(value) ? value : fallback;
    }

    function nullableInteger(value) {
        return Number.isInteger(value) ? value : null;
    }

    function emptyRanking() {
        return {
            version: 1,
            updatedAt: null,
            gamesRecorded: 0,
            processedGameIDs: [],
            players: {}
        };
    }

    function emptyPlayerStats(name) {
        return {
            name: normalizePlayerName(name),
            gamesPlayed: 0,
            wins: 0,
            roundsPlayed: 0,
            totalFinalScore: 0,
            bestGameScore: null,
            worstGameScore: null,
            bestRoundGain: null,
            worstRoundLoss: null,
            bestWinningMargin: null,
            lastGameScore: null,
            lastPlayedAt: null
        };
    }

    function sanitizePlayerStats(stats) {
        if (!isObject(stats)) {
            return null;
        }

        const base = emptyPlayerStats(stats.name);
        return {
            ...base,
            name: normalizePlayerName(stats.name),
            gamesPlayed: integerOr(stats.gamesPlayed, base.gamesPlayed),
            wins: integerOr(stats.wins, base.wins),
            roundsPlayed: integerOr(stats.roundsPlayed, base.roundsPlayed),
            totalFinalScore: integerOr(stats.totalFinalScore, base.totalFinalScore),
            bestGameScore: nullableInteger(stats.bestGameScore),
            worstGameScore: nullableInteger(stats.worstGameScore),
            bestRoundGain: nullableInteger(stats.bestRoundGain),
            worstRoundLoss: nullableInteger(stats.worstRoundLoss),
            bestWinningMargin: nullableInteger(stats.bestWinningMargin),
            lastGameScore: nullableInteger(stats.lastGameScore),
            lastPlayedAt: typeof stats.lastPlayedAt === "string" ? stats.lastPlayedAt : null
        };
    }

    function normalizeRanking(ranking) {
        if (!isObject(ranking) || ranking.version !== 1) {
            return emptyRanking();
        }

        const normalized = emptyRanking();
        normalized.updatedAt = typeof ranking.updatedAt === "string" ? ranking.updatedAt : null;
        normalized.gamesRecorded = integerOr(ranking.gamesRecorded, 0);
        normalized.processedGameIDs = Array.isArray(ranking.processedGameIDs)
            ? ranking.processedGameIDs.filter((gameID) => typeof gameID === "string" && gameID.trim())
            : [];

        if (isObject(ranking.players)) {
            Object.values(ranking.players).forEach((stats) => {
                const cleanStats = sanitizePlayerStats(stats);
                if (!cleanStats) {
                    return;
                }

                normalized.players[playerKey(cleanStats.name)] = cleanStats;
            });
        }

        return normalized;
    }

    function publicRanking(ranking) {
        const normalized = normalizeRanking(ranking);
        const players = Object.values(normalized.players).map((stats) => {
            const gamesPlayed = stats.gamesPlayed || 0;
            const wins = stats.wins || 0;
            const totalScore = stats.totalFinalScore || 0;
            return {
                ...stats,
                averageFinalScore: gamesPlayed ? Math.round((totalScore / gamesPlayed) * 100) / 100 : 0,
                winRate: gamesPlayed ? Math.round((wins / gamesPlayed) * 1000) / 1000 : 0
            };
        });

        function numericStat(stats, name, fallback = 0) {
            return Number.isInteger(stats[name]) ? stats[name] : fallback;
        }

        players.sort((first, second) => {
            const byWins = numericStat(second, "wins") - numericStat(first, "wins");
            if (byWins !== 0) {
                return byWins;
            }

            const byBestGame = numericStat(second, "bestGameScore", -1000000000)
                - numericStat(first, "bestGameScore", -1000000000);
            if (byBestGame !== 0) {
                return byBestGame;
            }

            const byTotalScore = numericStat(second, "totalFinalScore") - numericStat(first, "totalFinalScore");
            if (byTotalScore !== 0) {
                return byTotalScore;
            }

            return first.name.localeCompare(second.name, undefined, {
                numeric: true,
                sensitivity: "base"
            });
        });

        return {
            version: 1,
            updatedAt: normalized.updatedAt,
            gamesRecorded: normalized.gamesRecorded,
            players
        };
    }

    function validateSavePayload(payload) {
        if (!isObject(payload)) {
            throw new Error("Save data must be an object.");
        }

        if (payload.version !== 1) {
            throw new Error("Save data version is unsupported.");
        }

        if (!isObject(payload.state)) {
            throw new Error("Save data must include game state.");
        }

        if (!isObject(payload.state.engine)) {
            throw new Error("Save data must include a game engine snapshot.");
        }

        if (typeof payload.state.phase !== "string") {
            throw new Error("Save data must include the current phase.");
        }

        return payload;
    }

    function saveLatestGame(payload, storage) {
        const store = storageFrom(storage);
        if (!store) {
            return { ok: false, message: STORAGE_UNAVAILABLE };
        }

        try {
            store.setItem(LATEST_GAME_KEY, JSON.stringify(validateSavePayload(payload)));
            return { ok: true, message: "Game saved in this browser." };
        } catch (error) {
            return { ok: false, message: "Could not save the game in this browser." };
        }
    }

    function loadLatestGame(storage) {
        const store = storageFrom(storage);
        if (!store) {
            return { ok: false, payload: null, message: STORAGE_UNAVAILABLE };
        }

        let rawPayload;
        try {
            rawPayload = store.getItem(LATEST_GAME_KEY);
        } catch (error) {
            return { ok: false, payload: null, message: "Could not read the saved game." };
        }

        if (!rawPayload) {
            return { ok: true, payload: null, message: "No saved game in this browser." };
        }

        try {
            return {
                ok: true,
                payload: validateSavePayload(JSON.parse(rawPayload)),
                message: null
            };
        } catch (error) {
            return {
                ok: false,
                payload: null,
                message: "Saved game data is corrupted or unsupported."
            };
        }
    }

    function clearLatestGame(storage) {
        const store = storageFrom(storage);
        if (!store) {
            return { ok: false, message: STORAGE_UNAVAILABLE };
        }

        try {
            store.removeItem(LATEST_GAME_KEY);
            return { ok: true, message: "Saved game cleared." };
        } catch (error) {
            return { ok: false, message: "Could not clear the saved game." };
        }
    }

    function loadStoredRanking(storage) {
        const store = storageFrom(storage);
        if (!store) {
            return { ok: false, ranking: emptyRanking(), message: STORAGE_UNAVAILABLE };
        }

        let rawRanking;
        try {
            rawRanking = store.getItem(RANKING_KEY);
        } catch (error) {
            return { ok: false, ranking: emptyRanking(), message: "Could not read local statistics." };
        }

        if (!rawRanking) {
            return { ok: true, ranking: emptyRanking(), message: null };
        }

        try {
            return { ok: true, ranking: normalizeRanking(JSON.parse(rawRanking)), message: null };
        } catch (error) {
            return {
                ok: false,
                ranking: emptyRanking(),
                message: "Local statistics data is corrupted or unsupported."
            };
        }
    }

    function loadRanking(storage) {
        const result = loadStoredRanking(storage);
        return {
            ok: result.ok,
            ranking: publicRanking(result.ranking),
            message: result.message
        };
    }

    function saveRanking(ranking, storage) {
        const store = storageFrom(storage);
        if (!store) {
            return { ok: false, message: STORAGE_UNAVAILABLE };
        }

        try {
            store.setItem(RANKING_KEY, JSON.stringify(normalizeRanking(ranking)));
            return { ok: true, message: "Statistics saved in this browser." };
        } catch (error) {
            return { ok: false, message: "Could not save local statistics." };
        }
    }

    function validateGameResultPayload(payload) {
        if (!isObject(payload)) {
            throw new Error("Game result must be an object.");
        }

        if (payload.version !== 1) {
            throw new Error("Game result version is unsupported.");
        }

        if (typeof payload.gameID !== "string" || !payload.gameID.trim()) {
            throw new Error("Game result must include a gameID.");
        }

        if (!Array.isArray(payload.players) || payload.players.length === 0) {
            throw new Error("Game result must include players.");
        }

        payload.players.forEach((player) => {
            if (!isObject(player)) {
                throw new Error("Each player result must be an object.");
            }

            if (typeof player.name !== "string" || !player.name.trim()) {
                throw new Error("Each player result must include a name.");
            }

            if (!Number.isInteger(player.totalScore)) {
                throw new Error("Each player result must include a final score.");
            }
        });

        const rounds = payload.rounds || [];
        if (!Array.isArray(rounds)) {
            throw new Error("Game result rounds must be a list.");
        }

        rounds.forEach((roundSummary) => {
            if (!isObject(roundSummary)) {
                throw new Error("Each round summary must be an object.");
            }

            const results = roundSummary.results || [];
            if (!Array.isArray(results)) {
                throw new Error("Each round summary must include result rows.");
            }

            results.forEach((result) => {
                if (!isObject(result)) {
                    throw new Error("Each round result must be an object.");
                }

                if (!Number.isInteger(result.scoreDelta)) {
                    throw new Error("Each round result must include scoreDelta.");
                }
            });
        });

        return payload;
    }

    function recordFinishedGame(payload, storage) {
        const store = storageFrom(storage);
        if (!store) {
            return {
                ok: false,
                recorded: false,
                ranking: publicRanking(emptyRanking()),
                message: STORAGE_UNAVAILABLE
            };
        }

        let gameResult;
        try {
            gameResult = validateGameResultPayload(payload);
        } catch (error) {
            return {
                ok: false,
                recorded: false,
                ranking: publicRanking(emptyRanking()),
                message: error.message
            };
        }

        const loaded = loadStoredRanking(store);
        const ranking = loaded.ranking;
        const processedGameIDs = ranking.processedGameIDs;
        const gameID = gameResult.gameID.trim();

        if (processedGameIDs.includes(gameID)) {
            return {
                ok: true,
                recorded: false,
                ranking: publicRanking(ranking),
                message: "This game was already counted in this browser."
            };
        }

        const finalPlayers = gameResult.players;
        const finishedAt = typeof gameResult.finishedAt === "string"
            ? gameResult.finishedAt
            : new Date().toISOString();
        const maxScore = Math.max(...finalPlayers.map((player) => player.totalScore));
        const sortedScores = finalPlayers.map((player) => player.totalScore).sort((first, second) => second - first);
        const secondScore = sortedScores.length > 1 ? sortedScores[1] : maxScore;
        const winners = new Set(
            finalPlayers
                .filter((player) => player.totalScore === maxScore)
                .map((player) => playerKey(player.name))
        );
        const playerNamesByID = new Map(
            finalPlayers
                .filter((player) => typeof player.id === "string")
                .map((player) => [player.id, normalizePlayerName(player.name)])
        );

        finalPlayers.forEach((player) => {
            const key = playerKey(player.name);
            const stats = ranking.players[key] || emptyPlayerStats(player.name);

            stats.name = normalizePlayerName(player.name);
            stats.gamesPlayed += 1;
            stats.wins += winners.has(key) ? 1 : 0;
            stats.totalFinalScore += player.totalScore;
            stats.bestGameScore = updateOptionalMax(stats.bestGameScore, player.totalScore);
            stats.worstGameScore = updateOptionalMin(stats.worstGameScore, player.totalScore);
            stats.lastGameScore = player.totalScore;
            stats.lastPlayedAt = finishedAt;

            if (winners.has(key)) {
                stats.bestWinningMargin = updateOptionalMax(stats.bestWinningMargin, maxScore - secondScore);
            }

            ranking.players[key] = stats;
        });

        (gameResult.rounds || []).forEach((roundSummary) => {
            (roundSummary.results || []).forEach((result) => {
                const resultName = playerNamesByID.get(result.playerID) || result.playerName;
                if (typeof resultName !== "string") {
                    return;
                }

                const key = playerKey(resultName);
                const stats = ranking.players[key] || emptyPlayerStats(resultName);
                const delta = result.scoreDelta;

                stats.roundsPlayed += 1;
                stats.bestRoundGain = updateOptionalMax(stats.bestRoundGain, delta);
                stats.worstRoundLoss = updateOptionalMin(stats.worstRoundLoss, delta);
                ranking.players[key] = stats;
            });
        });

        processedGameIDs.push(gameID);
        processedGameIDs.splice(0, Math.max(0, processedGameIDs.length - 500));
        ranking.gamesRecorded += 1;
        ranking.updatedAt = finishedAt;

        const saved = saveRanking(ranking, store);
        if (!saved.ok) {
            return {
                ok: false,
                recorded: false,
                ranking: publicRanking(ranking),
                message: saved.message
            };
        }

        return {
            ok: true,
            recorded: true,
            ranking: publicRanking(ranking),
            message: loaded.ok ? "Local statistics updated." : "Local statistics were reset before updating."
        };
    }

    function resetRanking(storage) {
        const store = storageFrom(storage);
        if (!store) {
            return { ok: false, ranking: publicRanking(emptyRanking()), message: STORAGE_UNAVAILABLE };
        }

        try {
            store.removeItem(RANKING_KEY);
            return {
                ok: true,
                ranking: publicRanking(emptyRanking()),
                message: "Local statistics reset."
            };
        } catch (error) {
            return {
                ok: false,
                ranking: publicRanking(emptyRanking()),
                message: "Could not reset local statistics."
            };
        }
    }

    return {
        LATEST_GAME_KEY,
        RANKING_KEY,
        saveLatestGame,
        loadLatestGame,
        clearLatestGame,
        loadRanking,
        saveRanking,
        recordFinishedGame,
        resetRanking,
        emptyRanking,
        publicRanking,
        loadStoredRanking
    };
});
