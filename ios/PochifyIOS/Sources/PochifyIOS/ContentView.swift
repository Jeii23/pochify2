#if canImport(SwiftUI)
import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = GameViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()

                Group {
                    switch viewModel.phase {
                    case .welcome:
                        WelcomeView(viewModel: viewModel)
                    case .playerNames:
                        PlayerNamesView(viewModel: viewModel)
                    case .roundOverview:
                        RoundOverviewView(viewModel: viewModel)
                    case .bidding:
                        BiddingView(viewModel: viewModel)
                    case .roundDetails:
                        RoundDetailsView(viewModel: viewModel)
                    case .tricksInput:
                        TricksInputView(viewModel: viewModel)
                    case .scores:
                        ScoresView(viewModel: viewModel)
                    case .finalRanking:
                        FinalRankingView(viewModel: viewModel)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .alert(
                "Check this round",
                isPresented: Binding(
                    get: { viewModel.errorMessage != nil },
                    set: { isPresented in
                        if !isPresented {
                            viewModel.errorMessage = nil
                        }
                    }
                )
            ) {
                Button("OK", role: .cancel) {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}

enum AppTheme {
    static let background = Color(red: 0.96, green: 0.95, blue: 0.91)
    static let ink = Color(red: 0.12, green: 0.13, blue: 0.12)
    static let muted = Color(red: 0.39, green: 0.42, blue: 0.38)
    static let table = Color(red: 0.10, green: 0.36, blue: 0.27)
    static let felt = Color(red: 0.81, green: 0.88, blue: 0.74)
    static let gold = Color(red: 0.77, green: 0.53, blue: 0.16)
    static let red = Color(red: 0.70, green: 0.18, blue: 0.14)
    static let surface = Color.white.opacity(0.76)
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(configuration.isPressed ? AppTheme.table.opacity(0.8) : AppTheme.table)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(configuration.isPressed ? AppTheme.felt.opacity(0.6) : AppTheme.felt)
            .foregroundStyle(AppTheme.ink)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct ScreenHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.75)

            Text(subtitle)
                .font(.callout)
                .foregroundStyle(AppTheme.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(AppTheme.muted)
            Spacer(minLength: 16)
            Text(value)
                .fontWeight(.semibold)
                .foregroundStyle(AppTheme.ink)
                .multilineTextAlignment(.trailing)
        }
        .font(.body)
        .padding(.vertical, 6)
    }
}

struct PlayerScoreRow: View {
    let rank: Int?
    let name: String
    let score: Int
    let detail: String

    var body: some View {
        HStack(spacing: 12) {
            if let rank {
                Text("\(rank)")
                    .font(.headline.monospacedDigit())
                    .frame(width: 30, height: 30)
                    .background(rank == 1 ? AppTheme.gold.opacity(0.25) : AppTheme.felt)
                    .clipShape(Circle())
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(name)
                    .font(.headline)
                    .foregroundStyle(AppTheme.ink)
                    .lineLimit(1)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(AppTheme.muted)
                    .lineLimit(1)
            }

            Spacer()

            Text("\(score)")
                .font(.title3.monospacedDigit().weight(.semibold))
                .foregroundStyle(AppTheme.ink)
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }
}
#endif
