(function () {
    "use strict";

    const { GameEngine, ROUND_TYPE_LABELS } = window.PochifyCore;
    const STORAGE_KEY = "pochify-web-state-v1";

    const root = document.querySelector("#app");

    const defaultState = () => ({
        phase: "welcome",
        selectedPlayerCount: 3,
        playerNames: defaultNames(3),
        engine: null,
        activeRound: null,
        biddingIndex: 0,
        bidDraft: 0,
        tricksDrafts: {},
        errorMessage: null
    });

    let state = loadState();

    function defaultNames(count) {
        return Array.from({ length: count }, (_, index) => `Player ${index + 1}`);
    }

    function loadState() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return defaultState();
            }

            const snapshot = JSON.parse(raw);
            const loaded = {
                ...defaultState(),
                ...snapshot,
                engine: snapshot.engine ? GameEngine.fromSnapshot(snapshot.engine) : null,
                errorMessage: null
            };

            loaded.activeRound = loaded.engine ? loaded.engine.activeRound : null;
            return loaded;
        } catch (error) {
            console.warn("Could not restore Pochify state", error);
            return defaultState();
        }
    }

    function saveState() {
        const snapshot = {
            ...state,
            engine: state.engine ? state.engine.toSnapshot() : null,
            errorMessage: null
        };

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
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
        return ROUND_TYPE_LABELS[roundType] || roundType;
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

    function render() {
        const screen = {
            welcome: renderWelcome,
            playerNames: renderPlayerNames,
            roundOverview: renderRoundOverview,
            bidding: renderBidding,
            roundDetails: renderRoundDetails,
            tricksInput: renderTricksInput,
            scores: renderScores,
            finalRanking: renderFinalRanking
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
        saveState();
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
                    <span class="round-pill">${escapeHTML(roundText)}</span>
                    ${showGameActions ? `
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
                <span class="mini-card red-card">A</span>
                <span class="mini-card">K</span>
                <span class="mini-card gold-card">Q</span>
            </div>
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="continue">Continue</button>
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

                    return `
                        <article class="player-card">
                            <div class="player-card-head">
                                <div>
                                    <h2>${escapeHTML(player.name)}</h2>
                                    <p>Bid ${player.currentBid}</p>
                                </div>
                                <strong>${value}</strong>
                            </div>
                            ${renderStepper("Tricks", value, 0, round.cardsPerPlayer, "tricks", player.id)}
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
            <div class="action-bar">
                <button class="primary-button" type="button" data-action="restart">New game</button>
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
        if (!state.errorMessage) {
            return "";
        }

        return `
            <div class="toast" role="alert">
                <p>${escapeHTML(state.errorMessage)}</p>
                <button type="button" data-action="dismiss-error">OK</button>
            </div>
        `;
    }

    function bindInputs() {
        root.querySelectorAll("[data-player-name]").forEach((input) => {
            input.addEventListener("input", (event) => {
                const index = Number(event.currentTarget.dataset.playerName);
                state.playerNames[index] = event.currentTarget.value;
                saveState();
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

    root.addEventListener("click", (event) => {
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
            } else if (action === "enter-tricks") {
                state.tricksDrafts = Object.fromEntries(players().map((player) => [
                    player.id,
                    player.lastTricksWon
                ]));
                state.phase = "tricksInput";
            } else if (action === "tricks-dec" || action === "tricks-inc") {
                updateTricks(control.dataset.playerId, action === "tricks-inc" ? 1 : -1);
            } else if (action === "complete-round") {
                completeRound();
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
            }
        } catch (error) {
            state.errorMessage = error.message;
        }

        render();
    });

    function startGame() {
        const engine = new GameEngine(state.selectedPlayerCount);
        engine.updatePlayerNames(state.playerNames);
        state.engine = engine;
        state.activeRound = engine.beginNextRound();
        state.biddingIndex = 0;
        state.bidDraft = 0;
        state.tricksDrafts = {};
        state.errorMessage = null;
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

    function updateTricks(playerID, delta) {
        if (!state.activeRound) {
            return;
        }

        const current = state.tricksDrafts[playerID] || 0;
        state.tricksDrafts[playerID] = Math.max(
            0,
            Math.min(state.activeRound.cardsPerPlayer, current + delta)
        );
    }

    function completeRound() {
        state.engine.completeRound(state.tricksDrafts);
        state.activeRound = state.engine.activeRound;
        state.phase = state.engine.isFinished ? "finalRanking" : "scores";
        render();
    }

    function resetGame() {
        state = defaultState();
        window.localStorage.removeItem(STORAGE_KEY);
    }

    render();
})();
