(function () {
    "use strict";

    const { GameEngine, ROUND_TYPE_LABELS } = window.PochifyCore;
    const Storage = window.PochifyStorage;

    const root = document.querySelector("#app");

    const defaultState = () => ({
        phase: "welcome",
        selectedPlayerCount: 3,
        playerNames: defaultNames(3),
        engine: null,
        gameID: null,
        activeRound: null,
        biddingIndex: 0,
        bidDraft: 0,
        tricksDrafts: {},
        roundHistory: [],
        ranking: null,
        rankingSubmittedGameID: null,
        statsReturnPhase: "welcome",
        roundHistoryReturnPhase: "welcome",
        errorMessage: null,
        noticeMessage: null
    });

    let state = defaultState();

    function defaultNames(count) {
        return Array.from({ length: count }, (_, index) => `Player ${index + 1}`);
    }

    function createClientID() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function roundTypeName(roundType) {
        return ROUND_TYPE_LABELS[roundType] || roundType || "Round";
    }

    function playerName(playerID) {
        const player = state.engine ? state.engine.player(playerID) : null;
        return player ? player.name : "Player";
    }

    function players() {
        return state.engine ? state.engine.players : [];
    }

    function playerOrder() {
        if (!state.engine || !state.activeRound) {
            return [];
        }

        return state.activeRound.playerOrderIDs
            .map((playerID) => state.engine.player(playerID))
            .filter(Boolean);
    }

    function currentBiddingPlayer() {
        const order = playerOrder();
        return state.biddingIndex < order.length ? order[state.biddingIndex] : null;
    }

    function currentTotalBids() {
        if (!state.activeRound) {
            return 0;
        }

        const currentPlayer = currentBiddingPlayer();

        return state.activeRound.playerOrderIDs.reduce((total, playerID) => {
            if (currentPlayer && playerID === currentPlayer.id) {
                return total + state.bidDraft;
            }

            const player = state.engine.player(playerID);
            return total + (player ? player.currentBid : 0);
        }, 0);
    }

    function currentBidValidationMessage() {
        const player = currentBiddingPlayer();
        if (!player || !state.engine) {
            return null;
        }

        return state.engine.bidValidationMessage(player.id, state.bidDraft);
    }

    function totalTricksDraft() {
        return Object.values(state.tricksDrafts).reduce((total, value) => total + value, 0);
    }

    function canCompleteTricks() {
        return Boolean(state.activeRound && totalTricksDraft() === state.activeRound.cardsPerPlayer);
    }

    function maxTricksForPlayer(playerID) {
        if (!state.activeRound) {
            return 0;
        }

        const current = state.tricksDrafts[playerID] || 0;
        const totalWithoutPlayer = totalTricksDraft() - current;
        const max = state.activeRound.cardsPerPlayer - totalWithoutPlayer;

        return Math.max(0, Math.min(state.activeRound.cardsPerPlayer, max));
    }

    function render() {
        const screen = {
            welcome: renderWelcome,
            playerNames: renderPlayerNames,
            roundOverview: renderRoundOverview,
            bidding: renderBidding,
            roundDetails: renderRoundDetails,
            tricksInput: renderTricksInput,
            scores: renderScores,
            finalRanking: renderFinalRanking,
            roundHistoryView: renderRoundHistoryView,
            statistics: renderStatisticsView
        }[state.phase] || renderWelcome;

        root.innerHTML = `
            <div class="app-shell">
                ${renderTopBar()}
                <main class="screen" aria-live="polite">
                    ${screen()}
                </main>
                ${renderError()}
            </div>
        `;

        bindInputs();
    }

    function renderTopBar() {
        const showGameActions = Boolean(state.engine);
        const round = state.activeRound || (state.engine ? state.engine.activeRound : null);
        const roundText = round
            ? `Round ${round.roundNumber}/${round.totalRounds}`
            : state.engine
                ? `Round ${state.engine.currentRound}/${state.engine.totalRounds}`
                : "La Pocha";

        return `
            <header class="top-bar">
                <div class="brand">
                    <img src="assets/pochify-mark.svg" alt="" class="brand-mark">
                    <span>Pochify</span>
                </div>
                <div class="top-actions">
                    ${showGameActions ? `
                        <button
                            class="round-pill"
                            type="button"
                            data-action="open-round-history"
                            aria-label="View round history"
                        >${escapeHTML(roundText)}</button>
                    ` : `
                        <span class="round-pill">${escapeHTML(roundText)}</span>
                    `}
                    ${showGameActions ? `
                        <button class="utility-button" type="button" data-action="save-game">Save</button>
                        <button class="icon-button" type="button" data-action="restart-confirm" aria-label="New game">
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                                <path d="M20 12a8 8 0 1 1-2.34-5.66"/>
                                <path d="M20 4v5h-5"/>
                            </svg>
                        </button>
                    ` : ""}
                </div>
            </header>
        `;
    }

    function renderHeader(title, subtitle) {
        return `
            <section class="screen-header">
                <h1>${escapeHTML(title)}</h1>
                <p>${escapeHTML(subtitle)}</p>
            </section>
        `;
    }

    function renderWelcome() {
        return `
            ${renderHeader("Pochify", "Scorekeeper for La Pocha.")}
            <section class="field-group">
                <label class="field-label">Players</label>
                <div class="segmented" role="group" aria-label="Players">
                    ${[3, 4, 5].map((count) => `
                        <button
                            class="segment ${state.selectedPlayerCount === count ? "is-selected" : ""}"
                            type="button"
                            data-action="select-player-count"
                            data-count="${count}"
                            aria-pressed="${state.selectedPlayerCount === count}"
                        >${count}</button>
                    `).join("")}
                </div>
            </section>
            <div class="visual-table" aria-hidden="true">
                <span class="mini-card suit-card gold-card">
                    <svg viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="16"/>
                        <circle cx="32" cy="32" r="7"/>
                    </svg>
                    <span>Oro</span>
                </span>
                <span class="mini-card suit-card sword-card">
                    <svg viewBox="0 0 64 64">
                        <path d="M34 8l6 6-19 28-5 1 1-5z"/>
                        <path d="M20 42l-8 8"/>
                        <path d="M17 34l13 13"/>
                    </svg>
                    <span>Espasa</span>
                </span>
                <span class="mini-card suit-card red-card">
                    <svg viewBox="0 0 64 64">
                        <path d="M20 14h24l-4 25a8 8 0 0 1-16 0z"/>
                        <path d="M25 50h14"/>
                        <path d="M32 45v5"/>
                        <path d="M20 18c-6 1-8 5-7 10 1 4 4 7 10 8"/>
                        <path d="M44 18c6 1 8 5 7 10-1 4-4 7-10 8"/>
                    </svg>
                    <span>Copa</span>
                </span>
            </div>
            ${renderLocalRanking()}
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="continue">Continue</button>
                <button class="secondary-button" type="button" data-action="load-game">Load saved game</button>
                <button class="secondary-button" type="button" data-action="open-statistics">Statistics</button>
                <button class="secondary-button" type="button" data-action="clear-saved-game">Clear saved game</button>
            </div>
        `;
    }

    function renderPlayerNames() {
        return `
            ${renderHeader("Players", "Name each seat.")}
            <form class="stack" data-form="player-names">
                ${state.playerNames.map((name, index) => `
                    <label class="text-field">
                        <span>Player ${index + 1}</span>
                        <input
                            type="text"
                            value="${escapeHTML(name)}"
                            data-player-name="${index}"
                            autocomplete="name"
                            inputmode="text"
                            autocapitalize="words"
                        >
                    </label>
                `).join("")}
            </form>
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="start-game">Start game</button>
            </div>
        `;
    }

    function renderRoundOverview() {
        const round = state.activeRound;
        if (!round) {
            return renderEmptyGame();
        }

        return `
            ${renderHeader(`Round ${round.roundNumber}`, "Hand setup.")}
            <section class="info-panel">
                ${renderInfoRow("Round", `${round.roundNumber} of ${round.totalRounds}`)}
                ${renderInfoRow("Type", roundTypeName(round.roundType))}
                ${renderInfoRow("Cards", round.cardsPerPlayer)}
                ${renderInfoRow("Starts", playerName(round.startingPlayerID))}
            </section>
            <section class="list-section">
                <h2>Order</h2>
                <div class="rows">
                    ${playerOrder().map((player, index) => `
                        <div class="order-row">
                            <span class="index-badge">${index + 1}</span>
                            <span>${escapeHTML(player.name)}</span>
                        </div>
                    `).join("")}
                </div>
            </section>
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="start-bidding">Start bidding</button>
            </div>
        `;
    }

    function renderBidding() {
        const round = state.activeRound;
        const player = currentBiddingPlayer();
        if (!round || !player) {
            return renderEmptyGame();
        }

        const message = currentBidValidationMessage();
        const canUndoBid = state.biddingIndex > 0;

        return `
            ${renderHeader(player.name, "Bid")}
            <section class="score-panel">
                <div class="counter-header">
                    <span>Bid</span>
                    <strong>${state.bidDraft}</strong>
                </div>
                ${renderStepper("Bid", state.bidDraft, 0, round.cardsPerPlayer, "bid")}
                <div class="split-metrics">
                    <span>Cards <strong>${round.cardsPerPlayer}</strong></span>
                    <span>Total bids <strong>${currentTotalBids()}</strong></span>
                </div>
            </section>
            ${message ? `<p class="validation-message">${escapeHTML(message)}</p>` : ""}
            <section class="list-section compact">
                <h2>Bids</h2>
                <div class="rows">
                    ${playerOrder().map((candidate) => `
                        <div class="bid-row ${candidate.id === player.id ? "is-current" : ""}">
                            <span>${escapeHTML(candidate.name)}</span>
                            <strong>${candidate.id === player.id ? state.bidDraft : candidate.currentBid}</strong>
                        </div>
                    `).join("")}
                </div>
            </section>
            <div class="action-bar">
                <button
                    class="primary-button"
                    type="button"
                    data-action="confirm-bid"
                    ${message ? "disabled" : ""}
                >Confirm bid</button>
                ${canUndoBid ? `
                    <button class="secondary-button" type="button" data-action="undo-bid">Back</button>
                ` : ""}
            </div>
        `;
    }

    function renderRoundDetails() {
        const round = state.activeRound;
        if (!round) {
            return renderEmptyGame();
        }

        return `
            ${renderHeader("Bids locked", "Table reference.")}
            <section class="info-panel">
                ${renderInfoRow("Round", `${round.roundNumber} of ${round.totalRounds}`)}
                ${renderInfoRow("Type", roundTypeName(round.roundType))}
                ${renderInfoRow("Cards", round.cardsPerPlayer)}
            </section>
            <section class="list-section">
                <h2>Player bids</h2>
                <div class="rows">
                    ${playerOrder().map((player) => `
                        <div class="bid-row">
                            <span>${escapeHTML(player.name)}</span>
                            <strong>${player.currentBid}</strong>
                        </div>
                    `).join("")}
                </div>
            </section>
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="enter-tricks">Enter tricks won</button>
                <button class="secondary-button" type="button" data-action="undo-bid">Edit bids</button>
            </div>
        `;
    }

    function renderTricksInput() {
        const round = state.activeRound;
        if (!round) {
            return renderEmptyGame();
        }

        const canComplete = canCompleteTricks();

        return `
            ${renderHeader("Tricks won", roundTypeName(round.roundType))}
            <section class="summary-strip ${canComplete ? "is-valid" : "is-invalid"}">
                <span>Total</span>
                <strong>${totalTricksDraft()} of ${round.cardsPerPlayer}</strong>
            </section>
            <section class="tricks-list">
                ${players().map((player) => {
                    const value = state.tricksDrafts[player.id] || 0;
                    const max = maxTricksForPlayer(player.id);

                    return `
                        <article class="player-card">
                            <div class="player-card-head">
                                <div>
                                    <h2>${escapeHTML(player.name)}</h2>
                                    <p>Bid ${player.currentBid}</p>
                                </div>
                                <strong>${value}</strong>
                            </div>
                            ${renderStepper("Tricks", value, 0, max, "tricks", player.id)}
                        </article>
                    `;
                }).join("")}
            </section>
            <div class="action-bar">
                <button
                    class="primary-button"
                    type="button"
                    data-action="complete-round"
                    ${canComplete ? "" : "disabled"}
                >Calculate scores</button>
            </div>
        `;
    }

    function renderRoundHistoryView() {
        if (!state.engine) {
            return renderEmptyGame();
        }

        const history = Array.isArray(state.roundHistory) ? state.roundHistory : [];

        return `
            ${renderHeader("Rounds", "Completed round scores.")}
            ${history.length === 0 ? `
                <section class="empty-panel">
                    <h2>No completed rounds yet</h2>
                    <p>Complete a round and it will appear here.</p>
                </section>
            ` : `
                <section class="round-history-list">
                    ${history.map(renderRoundHistoryCard).join("")}
                </section>
            `}
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="close-round-history">Back</button>
            </div>
        `;
    }

    function renderScores() {
        if (!state.engine) {
            return renderEmptyGame();
        }

        return `
            ${renderHeader("Scores", "Current ranking.")}
            <section class="score-list">
                ${state.engine.ranking.map((player, index) => renderScoreRow(player, index + 1, `Bid ${player.currentBid}, tricks ${player.lastTricksWon}`)).join("")}
            </section>
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="next-round">Next round</button>
            </div>
        `;
    }

    function renderFinalRanking() {
        if (!state.engine) {
            return renderEmptyGame();
        }

        const ranking = state.engine.ranking;
        const winner = ranking[0];

        return `
            ${renderHeader("Final ranking", "Game finished.")}
            ${winner ? `
                <section class="winner-panel">
                    <span>Winner</span>
                    <h2>${escapeHTML(winner.name)}</h2>
                    <p>${winner.totalScore} points</p>
                </section>
            ` : ""}
            <section class="score-list">
                ${ranking.map((player, index) => renderScoreRow(player, index + 1, "Final score")).join("")}
            </section>
            ${renderLocalRanking()}
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="restart">New game</button>
                <button class="secondary-button" type="button" data-action="submit-ranking">Update statistics</button>
                <button class="secondary-button" type="button" data-action="open-statistics">View statistics</button>
            </div>
        `;
    }

    function renderStatisticsView() {
        const ranking = state.ranking;
        const players = ranking && Array.isArray(ranking.players) ? ranking.players : [];

        return `
            ${renderHeader("Statistics", "Local player records.")}
            ${players.length === 0 ? `
                <section class="empty-panel">
                    <h2>No games recorded yet</h2>
                    <p>Finish a game and Pochify will add it to this browser automatically.</p>
                </section>
            ` : `
                <section class="stats-summary">
                    ${renderStat("Games", ranking.gamesRecorded || 0)}
                    ${renderStat("Players", players.length)}
                    ${renderStat("Updated", formatDateTime(ranking.updatedAt))}
                </section>
                <section class="ranking-list full">
                    ${players.map((player, index) => renderStatisticsCard(player, index + 1)).join("")}
                </section>
            `}
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="refresh-statistics">Refresh statistics</button>
                <button class="secondary-button" type="button" data-action="reset-statistics">Reset statistics</button>
                <button class="secondary-button" type="button" data-action="close-statistics">Back</button>
            </div>
        `;
    }

    function renderEmptyGame() {
        return `
            ${renderHeader("Pochify", "Start a new game.")}
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="restart">New game</button>
            </div>
        `;
    }

    function renderInfoRow(label, value) {
        return `
            <div class="info-row">
                <span>${escapeHTML(label)}</span>
                <strong>${escapeHTML(value)}</strong>
            </div>
        `;
    }

    function renderScoreRow(player, rank, detail) {
        return `
            <div class="score-row">
                <span class="rank-badge">${rank}</span>
                <div>
                    <strong>${escapeHTML(player.name)}</strong>
                    <span>${escapeHTML(detail)}</span>
                </div>
                <b>${player.totalScore}</b>
            </div>
        `;
    }

    function renderRoundHistoryCard(round) {
        const results = Array.isArray(round.results) ? round.results : [];
        const cards = Number.isInteger(round.cardsPerPlayer) ? round.cardsPerPlayer : "-";

        return `
            <article class="round-history-card">
                <div class="round-history-head">
                    <div>
                        <h2>Round ${escapeHTML(round.roundNumber || "-")}</h2>
                        <p>${escapeHTML(roundTypeName(round.roundType))} · ${escapeHTML(cards)} cards</p>
                    </div>
                </div>
                <div class="round-history-rows">
                    ${results.map(renderRoundHistoryResult).join("")}
                </div>
            </article>
        `;
    }

    function renderRoundHistoryResult(result) {
        return `
            <div class="round-result-row">
                <div>
                    <strong>${escapeHTML(result.playerName || "Player")}</strong>
                    <span>Bid ${escapeHTML(formatInteger(result.bid))}, tricks ${escapeHTML(formatInteger(result.tricksWon))}</span>
                </div>
                <div class="round-result-score">
                    <strong>${escapeHTML(formatSignedInteger(result.scoreDelta))}</strong>
                    <span>Total ${escapeHTML(formatInteger(result.totalScore))}</span>
                </div>
            </div>
        `;
    }

    function renderLocalRanking() {
        const ranking = state.ranking;
        if (!ranking || !Array.isArray(ranking.players) || ranking.players.length === 0) {
            return "";
        }

        return `
            <section class="ranking-panel">
                <div class="section-title-row">
                    <h2>Local ranking</h2>
                    <span>${ranking.gamesRecorded || 0} games</span>
                </div>
                <div class="ranking-list">
                    ${ranking.players.slice(0, 8).map((player, index) => `
                        <article class="ranking-card">
                            <div class="ranking-main">
                                <span class="rank-badge">${index + 1}</span>
                                <div>
                                    <h3>${escapeHTML(player.name)}</h3>
                                    <p>${player.wins} wins · ${player.gamesPlayed} games</p>
                                </div>
                            </div>
                            <div class="stat-grid">
                                ${renderStat("Best game", player.bestGameScore)}
                                ${renderStat("Best round", player.bestRoundGain)}
                                ${renderStat("Worst round", player.worstRoundLoss)}
                                ${renderStat("Avg game", player.averageFinalScore)}
                            </div>
                        </article>
                    `).join("")}
                </div>
            </section>
        `;
    }

    function renderStatisticsCard(player, rank) {
        return `
            <article class="ranking-card statistics-card">
                <div class="ranking-main">
                    <span class="rank-badge">${rank}</span>
                    <div>
                        <h3>${escapeHTML(player.name)}</h3>
                        <p>${player.wins} wins · ${player.gamesPlayed} games · ${formatPercent(player.winRate)} win rate</p>
                    </div>
                </div>
                <div class="stat-grid detailed">
                    ${renderStat("Wins", player.wins)}
                    ${renderStat("Games", player.gamesPlayed)}
                    ${renderStat("Rounds", player.roundsPlayed)}
                    ${renderStat("Win rate", formatPercent(player.winRate))}
                    ${renderStat("Best game", player.bestGameScore)}
                    ${renderStat("Worst game", player.worstGameScore)}
                    ${renderStat("Avg game", player.averageFinalScore)}
                    ${renderStat("Last game", player.lastGameScore)}
                    ${renderStat("Best round", player.bestRoundGain)}
                    ${renderStat("Worst round", player.worstRoundLoss)}
                    ${renderStat("Best margin", player.bestWinningMargin)}
                    ${renderStat("Last played", formatDateTime(player.lastPlayedAt))}
                </div>
            </article>
        `;
    }

    function renderStat(label, value) {
        return `
            <span class="stat-chip">
                <small>${escapeHTML(label)}</small>
                <strong>${value === null || value === undefined ? "-" : escapeHTML(value)}</strong>
            </span>
        `;
    }

    function formatPercent(value) {
        if (typeof value !== "number") {
            return "-";
        }

        return `${Math.round(value * 100)}%`;
    }

    function formatDateTime(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatInteger(value) {
        return Number.isInteger(value) ? String(value) : "-";
    }

    function formatSignedInteger(value) {
        if (!Number.isInteger(value)) {
            return "-";
        }

        return value > 0 ? `+${value}` : String(value);
    }

    function renderStepper(label, value, min, max, actionPrefix, playerID) {
        const playerAttribute = playerID ? `data-player-id="${escapeHTML(playerID)}"` : "";

        return `
            <div class="stepper" aria-label="${escapeHTML(label)}">
                <button
                    type="button"
                    data-action="${actionPrefix}-dec"
                    ${playerAttribute}
                    ${value <= min ? "disabled" : ""}
                    aria-label="Decrease ${escapeHTML(label)}"
                >-</button>
                <output>${value}</output>
                <button
                    type="button"
                    data-action="${actionPrefix}-inc"
                    ${playerAttribute}
                    ${value >= max ? "disabled" : ""}
                    aria-label="Increase ${escapeHTML(label)}"
                >+</button>
            </div>
        `;
    }

    function renderError() {
        const message = state.errorMessage || state.noticeMessage;
        if (!message) {
            return "";
        }

        const type = state.errorMessage ? "error" : "notice";

        return `
            <div class="toast ${type}" role="alert">
                <p>${escapeHTML(message)}</p>
                <button type="button" data-action="dismiss-error">OK</button>
            </div>
        `;
    }

    function bindInputs() {
        root.querySelectorAll("[data-player-name]").forEach((input) => {
            input.addEventListener("input", (event) => {
                const index = Number(event.currentTarget.dataset.playerName);
                state.playerNames[index] = event.currentTarget.value;
            });

            input.addEventListener("keydown", (event) => {
                if (event.key !== "Enter") {
                    return;
                }

                event.preventDefault();
                const fields = [...root.querySelectorAll("[data-player-name]")];
                const currentIndex = fields.indexOf(event.currentTarget);

                if (currentIndex < fields.length - 1) {
                    fields[currentIndex + 1].focus();
                } else {
                    startGame();
                }
            });
        });
    }

    root.addEventListener("click", async (event) => {
        const control = event.target.closest("[data-action]");
        if (!control || control.disabled) {
            return;
        }

        const action = control.dataset.action;

        try {
            if (action === "select-player-count") {
                const count = Number(control.dataset.count);
                state.selectedPlayerCount = count;
                state.playerNames = defaultNames(count);
            } else if (action === "continue") {
                state.playerNames = defaultNames(state.selectedPlayerCount);
                state.phase = "playerNames";
            } else if (action === "start-game") {
                startGame();
                return;
            } else if (action === "save-game") {
                saveGameLocally();
                return;
            } else if (action === "load-game") {
                loadGameLocally();
                return;
            } else if (action === "clear-saved-game") {
                clearSavedGame();
                return;
            } else if (action === "open-statistics") {
                openStatistics();
                return;
            } else if (action === "open-round-history") {
                openRoundHistory();
            } else if (action === "close-round-history") {
                closeRoundHistory();
            } else if (action === "refresh-statistics") {
                refreshRankingFromStorage({ notice: "Statistics refreshed." });
                return;
            } else if (action === "reset-statistics") {
                resetStatistics();
                return;
            } else if (action === "close-statistics") {
                state.phase = state.statsReturnPhase || "welcome";
            } else if (action === "start-bidding") {
                state.biddingIndex = 0;
                state.bidDraft = currentBiddingPlayer() ? currentBiddingPlayer().currentBid : 0;
                state.phase = "bidding";
            } else if (action === "bid-dec") {
                state.bidDraft = Math.max(0, state.bidDraft - 1);
            } else if (action === "bid-inc") {
                state.bidDraft = Math.min(state.activeRound.cardsPerPlayer, state.bidDraft + 1);
            } else if (action === "confirm-bid") {
                confirmBid();
                return;
            } else if (action === "undo-bid") {
                undoBid();
            } else if (action === "enter-tricks") {
                state.tricksDrafts = Object.fromEntries(players().map((player) => [
                    player.id,
                    player.lastTricksWon
                ]));
                state.phase = "tricksInput";
            } else if (action === "tricks-dec" || action === "tricks-inc") {
                updateTricks(control.dataset.playerId, action === "tricks-inc" ? 1 : -1);
            } else if (action === "complete-round") {
                await completeRound();
                return;
            } else if (action === "submit-ranking") {
                submitFinishedGameToLocalRanking();
                return;
            } else if (action === "next-round") {
                state.activeRound = state.engine.beginNextRound();
                state.biddingIndex = 0;
                state.bidDraft = 0;
                state.tricksDrafts = {};
                state.phase = "roundOverview";
            } else if (action === "restart") {
                resetGame();
            } else if (action === "restart-confirm") {
                if (window.confirm("Start a new game?")) {
                    resetGame();
                }
            } else if (action === "dismiss-error") {
                state.errorMessage = null;
                state.noticeMessage = null;
            }
        } catch (error) {
            state.errorMessage = error.message;
            state.noticeMessage = null;
        }

        render();
    });

    function startGame() {
        const engine = new GameEngine(state.selectedPlayerCount);
        engine.updatePlayerNames(state.playerNames);
        state.engine = engine;
        state.gameID = createClientID();
        state.activeRound = engine.beginNextRound();
        state.biddingIndex = 0;
        state.bidDraft = 0;
        state.tricksDrafts = {};
        state.roundHistory = [];
        state.rankingSubmittedGameID = null;
        state.roundHistoryReturnPhase = "roundOverview";
        state.errorMessage = null;
        state.noticeMessage = null;
        state.phase = "roundOverview";
        render();
    }

    function confirmBid() {
        const player = currentBiddingPlayer();
        if (!player) {
            return;
        }

        state.engine.setBid(player.id, state.bidDraft);
        state.biddingIndex += 1;

        if (state.biddingIndex >= playerOrder().length) {
            state.phase = "roundDetails";
        } else {
            const nextPlayer = currentBiddingPlayer();
            state.bidDraft = nextPlayer ? nextPlayer.currentBid : 0;
        }

        render();
    }

    function undoBid() {
        const order = playerOrder();
        if (order.length === 0) {
            return;
        }

        if (state.phase === "roundDetails") {
            state.biddingIndex = order.length;
        }

        if (state.biddingIndex <= 0) {
            return;
        }

        state.biddingIndex -= 1;
        state.phase = "bidding";

        const player = currentBiddingPlayer();
        state.bidDraft = player ? player.currentBid : 0;
    }

    function updateTricks(playerID, delta) {
        if (!state.activeRound || !playerID) {
            return;
        }

        const current = state.tricksDrafts[playerID] || 0;
        const max = maxTricksForPlayer(playerID);
        state.tricksDrafts[playerID] = Math.max(
            0,
            Math.min(max, current + delta)
        );
    }

    function openRoundHistory() {
        if (!state.engine) {
            return;
        }

        if (state.phase !== "roundHistoryView") {
            state.roundHistoryReturnPhase = state.phase;
        }

        state.phase = "roundHistoryView";
    }

    function closeRoundHistory() {
        const fallbackPhase = state.engine && state.engine.isFinished
            ? "finalRanking"
            : state.activeRound
                ? "roundOverview"
                : "scores";
        const returnPhase = state.roundHistoryReturnPhase;
        const canUseReturnPhase = returnPhase
            && returnPhase !== "roundHistoryView"
            && !(state.engine && returnPhase === "welcome");

        state.phase = canUseReturnPhase ? returnPhase : fallbackPhase;
    }

    async function completeRound() {
        const completedRound = state.activeRound;
        const results = state.engine.completeRound(state.tricksDrafts);
        state.roundHistory.push({
            roundNumber: completedRound.roundNumber,
            roundType: completedRound.roundType,
            cardsPerPlayer: completedRound.cardsPerPlayer,
            results
        });
        state.activeRound = state.engine.activeRound;
        state.phase = state.engine.isFinished ? "finalRanking" : "scores";
        render();

        if (state.engine.isFinished) {
            submitFinishedGameToLocalRanking();
        }
    }

    function resetGame() {
        state = defaultState();
    }

    function makeSavePayload() {
        return {
            version: 1,
            savedAt: new Date().toISOString(),
            state: {
                phase: state.phase,
                selectedPlayerCount: state.selectedPlayerCount,
                playerNames: state.playerNames,
                engine: state.engine ? state.engine.toSnapshot() : null,
                gameID: state.gameID,
                activeRound: state.engine ? state.engine.activeRound : null,
                biddingIndex: state.biddingIndex,
                bidDraft: state.bidDraft,
                tricksDrafts: state.tricksDrafts,
                roundHistory: state.roundHistory,
                roundHistoryReturnPhase: state.roundHistoryReturnPhase,
                rankingSubmittedGameID: state.rankingSubmittedGameID
            }
        };
    }

    function hydrateSavedState(savedState) {
        const engine = savedState.engine ? GameEngine.fromSnapshot(savedState.engine) : null;

        return {
            ...defaultState(),
            phase: savedState.phase || "welcome",
            selectedPlayerCount: savedState.selectedPlayerCount || 3,
            playerNames: Array.isArray(savedState.playerNames)
                ? savedState.playerNames
                : defaultNames(savedState.selectedPlayerCount || 3),
            engine,
            gameID: savedState.gameID || createClientID(),
            activeRound: engine ? engine.activeRound : null,
            biddingIndex: Number.isInteger(savedState.biddingIndex) ? savedState.biddingIndex : 0,
            bidDraft: Number.isInteger(savedState.bidDraft) ? savedState.bidDraft : 0,
            tricksDrafts: savedState.tricksDrafts && typeof savedState.tricksDrafts === "object"
                ? savedState.tricksDrafts
                : {},
            roundHistory: Array.isArray(savedState.roundHistory) ? savedState.roundHistory : [],
            rankingSubmittedGameID: savedState.rankingSubmittedGameID || null,
            statsReturnPhase: state.statsReturnPhase,
            roundHistoryReturnPhase: typeof savedState.roundHistoryReturnPhase === "string"
                ? savedState.roundHistoryReturnPhase
                : "welcome",
            ranking: state.ranking,
            noticeMessage: "Saved game loaded from this browser."
        };
    }

    function saveGameLocally() {
        if (!state.engine) {
            state.errorMessage = "Start a game before saving.";
            state.noticeMessage = null;
            render();
            return;
        }

        const result = Storage.saveLatestGame(makeSavePayload());

        state.errorMessage = result.ok ? null : result.message;
        state.noticeMessage = result.ok ? result.message : null;
        render();
    }

    function clearSavedGame() {
        if (!window.confirm("Clear the saved game from this browser?")) {
            return;
        }

        const result = Storage.clearLatestGame();
        state.errorMessage = result.ok ? null : result.message;
        state.noticeMessage = result.ok ? result.message : null;
        render();
    }

    function openStatistics() {
        state.statsReturnPhase = state.phase === "statistics" ? "welcome" : state.phase;
        refreshRankingFromStorage({
            nextPhase: "statistics",
            notice: null
        });
    }

    function loadGameLocally() {
        if (state.engine && !window.confirm("Load the saved game from this browser and replace the current game?")) {
            return;
        }

        const result = Storage.loadLatestGame();

        if (!result.ok) {
            state.errorMessage = result.message;
            state.noticeMessage = null;
            render();
            return;
        }

        if (!result.payload) {
            state.errorMessage = "There is no saved game in this browser yet.";
            state.noticeMessage = null;
            render();
            return;
        }

        state = hydrateSavedState(result.payload.state || result.payload);
        render();
    }

    function makeFinishedGamePayload() {
        return {
            version: 1,
            gameID: state.gameID || createClientID(),
            finishedAt: new Date().toISOString(),
            players: state.engine.players.map((player) => ({
                id: player.id,
                name: player.name,
                totalScore: player.totalScore
            })),
            rounds: state.roundHistory
        };
    }

    function submitFinishedGameToLocalRanking() {
        if (!state.engine || !state.engine.isFinished) {
            state.errorMessage = "Finish the game before updating statistics.";
            state.noticeMessage = null;
            render();
            return;
        }

        if (state.rankingSubmittedGameID === state.gameID && state.ranking) {
            state.noticeMessage = "This game is already in local statistics.";
            state.errorMessage = null;
            render();
            return;
        }

        const result = Storage.recordFinishedGame(makeFinishedGamePayload());

        state.ranking = result.ranking;
        state.rankingSubmittedGameID = result.ok ? state.gameID : state.rankingSubmittedGameID;
        state.errorMessage = result.ok ? null : result.message;
        state.noticeMessage = result.ok
            ? result.message
            : null;
        render();
    }

    function refreshRankingFromStorage(options = {}) {
        const result = Storage.loadRanking();
        state.ranking = result.ranking;

        if (options.nextPhase) {
            state.phase = options.nextPhase;
        }

        if (!options.silent) {
            state.errorMessage = result.ok ? null : result.message;
            state.noticeMessage = result.ok
                ? options.notice === undefined
                    ? "Statistics refreshed."
                    : options.notice
                : null;
        }

        render();
    }

    function resetStatistics() {
        if (!window.confirm("Reset all local statistics in this browser?")) {
            return;
        }

        const result = Storage.resetRanking();
        state.ranking = result.ranking;
        state.rankingSubmittedGameID = null;
        state.errorMessage = result.ok ? null : result.message;
        state.noticeMessage = result.ok ? result.message : null;
        render();
    }

    render();
    refreshRankingFromStorage({ silent: true });
})();
