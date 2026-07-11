import SwiftUI

struct DashboardView: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    DashboardHeader()
                    SalesMetricsGrid()
                    TablesOverviewGrid()
                    ProductPerformanceCard()
                }
                .padding()
            }
            .background(Color.gray.opacity(0.08))
            .navigationTitle("Business dashboard")
        }
    }
}

private struct DashboardHeader: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text(store.business.name)
                    .font(.largeTitle.bold())
                Text("\(store.branch.name) • \(store.business.taxLabel)")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Label("Live", systemImage: "dot.radiowaves.left.and.right")
                .font(.headline)
                .foregroundStyle(.green)
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct SalesMetricsGrid: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 190), spacing: 12)], spacing: 12) {
            DashboardMetric(title: "Daily revenue", value: store.dailySummary.revenue.formatted, symbol: "chart.line.uptrend.xyaxis", color: .green)
            DashboardMetric(title: "Tips", value: store.dailySummary.tips.formatted, symbol: "heart.fill", color: .pink)
            DashboardMetric(title: "Active tables", value: "\(store.dailySummary.openTables)", symbol: "table.furniture", color: .blue)
            DashboardMetric(title: "Pending orders", value: "\(store.dailySummary.pendingOrders)", symbol: "bell.badge.fill", color: .orange)
            DashboardMetric(title: "Average ticket", value: store.dailySummary.averageTicket.formatted, symbol: "person.2.fill", color: .purple)
        }
    }
}

private struct TablesOverviewGrid: View {
    @Environment(PayliftDemoStore.self) private var store

    private var tableCards: [(String, String, Money, Money, Color)] {
        [
            (store.table.number, "Preparing order", store.billTotal, store.remainingTotal, .blue),
            ("5", "Bill pending", Money(amount: 1480), Money(amount: 620), .orange),
            ("8", "Served", Money(amount: 910), Money(amount: 910), .green),
            ("14", "Empty", .zero, .zero, .secondary),
            ("21", "Delayed order", Money(amount: 2240), Money(amount: 2240), .red),
            ("3", "Paid at POS", Money(amount: 760), .zero, .mint)
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tables")
                .font(.title2.bold())
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 12)], spacing: 12) {
                ForEach(tableCards, id: \.0) { card in
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Table \(card.0)")
                                .font(.title3.bold())
                            Spacer()
                            Circle()
                                .fill(card.4)
                                .frame(width: 10, height: 10)
                        }
                        Text(card.1)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Total")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(card.2.formatted)
                                    .font(.headline)
                            }
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text("Remaining")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(card.3.formatted)
                                    .font(.headline)
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }
}

private struct ProductPerformanceCard: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Product performance")
                    .font(.title2.bold())
                Spacer()
                Button { } label: {
                    Label("CSV", systemImage: "square.and.arrow.down")
                }
                .buttonStyle(.bordered)
            }

            ForEach(Array(store.dailySummary.topProducts.enumerated()), id: \.offset) { index, product in
                HStack {
                    Text("#\(index + 1)")
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 44, alignment: .leading)
                    Text(product)
                        .font(.headline)
                    Spacer()
                    ProgressView(value: Double(3 - index), total: 3)
                        .frame(maxWidth: 180)
                }
                .padding(.vertical, 6)
                Divider()
            }
        }
        .padding()
        .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct DashboardMetric: View {
    let title: String
    let value: String
    let symbol: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: symbol)
                .font(.title2)
                .foregroundStyle(color)
            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.title2.bold())
                    .minimumScaleFactor(0.75)
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}
