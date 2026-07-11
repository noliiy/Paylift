import SwiftUI

struct BillSplittingView: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    BillSummaryCard()
                    POSNoticeCard()
                    SharedItemsCard()
                    BillItemsSelectionCard()
                }
                .padding()
            }
            .background(Color.gray.opacity(0.08))
            .navigationTitle("Bill splitting")
        }
    }
}

private struct BillSummaryCard: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Table \(store.table.number)")
                        .font(.title.bold())
                    Text("Split for \(store.activeParticipant.displayName)")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text(store.remainingTotal.formatted)
                        .font(.title2.bold())
                    Text("Unpaid")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 12) {
                MetricPill(title: "Total", value: store.billTotal.formatted, symbol: "sum")
                MetricPill(title: "Remaining", value: store.remainingTotal.formatted, symbol: "clock")
                MetricPill(title: "Selected", value: selectedTotal.formatted, symbol: "checklist")
            }
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
    }

    private var selectedTotal: Money {
        store.unpaidBillItems
            .filter { store.selectedBillItemIDs.contains($0.id) }
            .reduce(.zero) { $0 + $1.remaining }
    }
}

private struct POSNoticeCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Pay at the counter", systemImage: "creditcard.and.123")
                .font(.headline)
            Text("Paylift tracks who ordered what and how the bill is split. Actual payment happens through the restaurant POS — not in this app.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.blue.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct SharedItemsCard: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Shared items")
                .font(.title2.bold())
            ForEach(store.unpaidBillItems) { item in
                if item.ownerShares.count > 1 || item.name.localizedCaseInsensitiveContains("meze") || item.name.localizedCaseInsensitiveContains("san") {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(item.name)
                                .font(.headline)
                            Text(item.ownerShares.map { participantName($0.participantID) }.joined(separator: ", "))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Split equally") {
                            store.splitItemEqually(item, between: store.participants.filter { $0.role == .customer }.map(\.id))
                        }
                        .buttonStyle(.bordered)
                    }
                    Divider()
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }

    private func participantName(_ id: PayliftID) -> String {
        store.participants.first(where: { $0.id == id })?.displayName ?? "Guest"
    }
}

private struct BillItemsSelectionCard: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Unpaid items")
                .font(.title2.bold())
            ForEach(store.unpaidBillItems) { item in
                Button {
                    store.toggleBillSelection(item)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: store.selectedBillItemIDs.contains(item.id) ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name)
                                .font(.headline)
                            Text(ownerDescription(for: item))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text(item.remaining.formatted)
                                .font(.headline)
                            Text(item.billStatus.rawValue)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .buttonStyle(.plain)
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func ownerDescription(for item: OrderItem) -> String {
        item.ownerShares.map { share in
            let name = store.participants.first(where: { $0.id == share.participantID })?.displayName ?? "Guest"
            return "\(name) \(share.amount.formatted)"
        }.joined(separator: " • ")
    }
}

private struct MetricPill: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: symbol)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
}
