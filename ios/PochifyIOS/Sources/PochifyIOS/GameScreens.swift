#if canImport(SwiftUI)
import PochifyCore
import SwiftUI

struct WelcomeView: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Spacer(minLength: 12)

            ScreenHeader(
                title: "Pochify",
                subtitle: "A touch-friendly scorekeeper for La Pocha."
            )

            VStack(alignment: .leading, spacing: 14) {
                Text("Players")
                    .font(.headline)
                    .foregroundStyle(AppTheme.ink)

                Picker("Players", selection: $viewModel.selectedPlayerCount) {
                    Text("3").tag(3)
                    Text("4").tag(4)
                    Text("5").tag(5)
                }
                .pickerStyle(.segmented)
            }

            Spacer()

            Button {
                viewModel.continueFromWelcome()
            } label: {
                Label("Continue", systemImage: "arrow.right")
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }
}

struct PlayerNamesView: View {
    @ObservedObject var viewModel: GameViewModel
    @FocusState private var focusedIndex: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ScreenHeader(
                title: "Players",
                subtitle: "Name each seat before the first hand."
            )

            VStack(spacing: 12) {
                ForEach(viewModel.playerNames.indices, id: \.self) { index in
                    TextField("Player \(index + 1)", text: viewModel.bindingForPlayerName(at: index))
                        .textInputAutocapitalization(.words)
                        .submitLabel(index == viewModel.playerNames.indices.last ? .done : .next)
                        .focused($focusedIndex, equals: index)
                        .padding(14)
                        .background(AppTheme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .stroke(AppTheme.felt, lineWidth: 1)
                        )
                        .onSubmit {
                            if index < viewModel.playerNames.count - 1 {
                                focusedIndex = index + 1
                            } else {
                                focusedIndex = nil
                            }
                        }
                }
            }

            Spacer()

            Button {
                focusedIndex = nil
                viewModel.createGame()
            } label: {
                Label("Start game", systemImage: "play.fill")
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }
}

struct RoundOverviewView: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ScreenHeader(
                title: "Round \(viewModel.activeRound?.roundNumber ?? 1)",
                subtitle: "Check the hand before bidding starts."
            )

            if let round = viewModel.activeRound {
                VStack(spacing: 0) {
                    InfoRow(label: "Round", value: "\(round.roundNumber) of \(round.totalRounds)")
                    Divider()
                    InfoRow(label: "Type", value: round.roundType.displayName)
                    Divider()
                    InfoRow(label: "Cards", value: "\(round.cardsPerPlayer)")
                    Divider()
                    InfoRow(label: "Starting player", value: viewModel.playerName(id: round.startingPlayerID))
                }
                .padding(16)
                .background(AppTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                VStack(alignment: .leading, spacing: 10) {
                    Text("Order")
                        .font(.headline)
                        .foregroundStyle(AppTheme.ink)
                    ForEach(Array(viewModel.playerOrder.enumerated()), id: \.element.id) { index, player in
                        HStack {
                            Text("\(index + 1)")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(AppTheme.muted)
                                .frame(width: 24)
                            Text(player.name)
                                .foregroundStyle(AppTheme.ink)
                            Spacer()
                        }
                        .padding(.vertical, 6)
                    }
                }
            }

            Spacer()

            Button {
                viewModel.startBidding()
            } label: {
                Label("Start bidding", systemImage: "hand.raised.fill")
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }
}

struct BiddingView: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ScreenHeader(
                title: viewModel.currentBiddingPlayer?.name ?? "Bid",
                subtitle: "Choose this player's bid."
            )

            if let round = viewModel.activeRound {
                VStack(spacing: 16) {
                    HStack {
                        Text("Bid")
                            .font(.headline)
                        Spacer()
                        Text("\(viewModel.bidDraft)")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(AppTheme.table)
                    }

                    Stepper(
                        value: $viewModel.bidDraft,
                        in: 0...round.cardsPerPlayer
                    ) {
                        Text("0 to \(round.cardsPerPlayer)")
                            .foregroundStyle(AppTheme.muted)
                    }

                    Divider()

                    InfoRow(label: "Cards", value: "\(round.cardsPerPlayer)")
                    InfoRow(label: "Total bids", value: "\(viewModel.currentTotalBids)")
                }
                .padding(18)
                .background(AppTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                if let message = viewModel.currentBidValidationMessage {
                    Label(message, systemImage: "exclamationmark.triangle.fill")
                        .font(.callout)
                        .foregroundStyle(AppTheme.red)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(alignment: .leading, spacing: 10) {
                    ForEach(viewModel.playerOrder) { player in
                        HStack {
                            Text(player.name)
                            Spacer()
                            Text(player.id == viewModel.currentBiddingPlayer?.id ? "\(viewModel.bidDraft)" : "\(player.currentBid)")
                                .monospacedDigit()
                                .fontWeight(.semibold)
                        }
                        .foregroundStyle(player.id == viewModel.currentBiddingPlayer?.id ? AppTheme.table : AppTheme.ink)
                    }
                }
                .font(.subheadline)
            }

            Spacer()

            Button {
                viewModel.confirmBid()
            } label: {
                Label("Confirm bid", systemImage: "checkmark")
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(!viewModel.canConfirmBid)
            .opacity(viewModel.canConfirmBid ? 1 : 0.45)
        }
    }
}

struct RoundDetailsView: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ScreenHeader(
                title: "Bids locked",
                subtitle: "Use this as the table reference while the hand is played."
            )

            if let round = viewModel.activeRound {
                VStack(spacing: 0) {
                    InfoRow(label: "Round", value: "\(round.roundNumber) of \(round.totalRounds)")
                    Divider()
                    InfoRow(label: "Type", value: round.roundType.displayName)
                    Divider()
                    InfoRow(label: "Cards", value: "\(round.cardsPerPlayer)")
                }
                .padding(16)
                .background(AppTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Player bids")
                    .font(.headline)
                    .foregroundStyle(AppTheme.ink)

                ForEach(viewModel.playerOrder) { player in
                    HStack {
                        Text(player.name)
                        Spacer()
                        Text("\(player.currentBid)")
                            .font(.headline.monospacedDigit())
                    }
                    .padding(.vertical, 8)
                }
            }

            Spacer()

            Button {
                viewModel.prepareTricksInput()
            } label: {
                Label("Enter tricks won", systemImage: "list.number")
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }
}

struct TricksInputView: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            ScreenHeader(
                title: "Tricks won",
                subtitle: "The total must match the cards in this round."
            )

            if let round = viewModel.activeRound {
                HStack {
                    Label("\(viewModel.totalTricksDraft) of \(round.cardsPerPlayer)", systemImage: "sum")
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(viewModel.canCompleteTricks ? AppTheme.table : AppTheme.red)
                    Spacer()
                    Text(round.roundType.displayName)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.muted)
                }
                .padding(.vertical, 4)

                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(viewModel.players) { player in
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(player.name)
                                            .font(.headline)
                                        Text("Bid \(player.currentBid)")
                                            .font(.caption)
                                            .foregroundStyle(AppTheme.muted)
                                    }
                                    Spacer()
                                    Text("\(viewModel.tricksDrafts[player.id, default: 0])")
                                        .font(.title2.monospacedDigit().weight(.bold))
                                        .foregroundStyle(AppTheme.table)
                                }

                                Stepper(
                                    "Tricks",
                                    value: viewModel.bindingForTricks(playerID: player.id),
                                    in: 0...round.cardsPerPlayer
                                )
                                .labelsHidden()
                            }
                            .padding(14)
                            .background(AppTheme.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                    }
                }
            }

            Button {
                viewModel.completeRound()
            } label: {
                Label("Calculate scores", systemImage: "function")
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(!viewModel.canCompleteTricks)
            .opacity(viewModel.canCompleteTricks ? 1 : 0.45)
        }
    }
}

struct ScoresView: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ScreenHeader(
                title: "Scores",
                subtitle: "Ranking after the completed round."
            )

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(Array(viewModel.sortedScores.enumerated()), id: \.element.id) { index, player in
                        PlayerScoreRow(
                            rank: index + 1,
                            name: player.name,
                            score: player.totalScore,
                            detail: "Bid \(player.currentBid), tricks \(player.lastTricksWon)"
                        )
                        if index < viewModel.sortedScores.count - 1 {
                            Divider()
                        }
                    }
                }
                .padding(16)
                .background(AppTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            Button {
                viewModel.nextRound()
            } label: {
                Label("Next round", systemImage: "arrow.right")
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }
}

struct FinalRankingView: View {
    @ObservedObject var viewModel: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            ScreenHeader(
                title: "Final ranking",
                subtitle: "Game finished."
            )

            if let winner = viewModel.sortedScores.first {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Winner")
                        .font(.caption)
                        .foregroundStyle(AppTheme.muted)
                    Text(winner.name)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(AppTheme.table)
                        .lineLimit(2)
                        .minimumScaleFactor(0.75)
                    Text("\(winner.totalScore) points")
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(AppTheme.ink)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(AppTheme.felt)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(Array(viewModel.sortedScores.enumerated()), id: \.element.id) { index, player in
                        PlayerScoreRow(
                            rank: index + 1,
                            name: player.name,
                            score: player.totalScore,
                            detail: "Final score"
                        )
                        if index < viewModel.sortedScores.count - 1 {
                            Divider()
                        }
                    }
                }
            }

            Button {
                viewModel.restart()
            } label: {
                Label("New game", systemImage: "arrow.counterclockwise")
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }
}
#endif
