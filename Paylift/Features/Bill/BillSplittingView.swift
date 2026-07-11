import SwiftUI

struct BillSplittingView: View {
    @Environment(PayliftDemoStore.self) private var store
    @State private var tipCents = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    BillSummaryCard(tipCents: $tipCents)
                    PaymentActionsCard(tipCents: tipCents)
                    SharedItemsCard()
                    BillItemsSelectionCard()
                }
                .padding()
            }
            .background(Color.gray.opacity(0.08))
            .navigationTitle("Hesap paylaşımı")
            .alert("Ödeme", isPresented: Binding(get: { store.paymentMessage != nil }, set: { if !$0 { store.paymentMessage = nil } })) {
                Button("Tamam", role: .cancel) { store.paymentMessage = nil }
            } message: {
                Text(store.paymentMessage ?? "")
            }
        }
    }
}

private struct BillSummaryCard: View {
    @Environment(PayliftDemoStore.self) private var store
    @Binding var tipCents: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Masa \(store.table.number)")
                        .font(.title.bold())
                    Text("\(store.activeParticipant.displayName) için ödeme")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text(store.remainingTotal.formatted)
                        .font(.title2.bold())
                    Text("Ödenmemiş")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 12) {
                MetricPill(title: "Toplam", value: store.billTotal.formatted, symbol: "sum")
                MetricPill(title: "Ödenen", value: store.paidTotal.formatted, symbol: "checkmark.seal")
                MetricPill(title: "Seçili", value: selectedTotal.formatted, symbol: "checklist")
            }

            VStack(alignment: .leading) {
                Text("Bahşiş")
                    .font(.headline)
                Picker("Bahşiş", selection: $tipCents) {
                    Text("Yok").tag(0)
                    Text("₺50").tag(5000)
                    Text("₺100").tag(10000)
                    Text("%10").tag(max(0, store.remainingTotal.cents / 10))
                }
                .pickerStyle(.segmented)
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

private struct PaymentActionsCard: View {
    @Environment(PayliftDemoStore.self) private var store
    let tipCents: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Ödeme seçenekleri")
                .font(.title2.bold())

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 220), spacing: 12)], spacing: 12) {
                PaymentButton(title: "Kendi siparişlerimi öde", symbol: "person.fill.checkmark", mode: .ownItems, tip: Money(cents: tipCents))
                PaymentButton(title: "Ürün seçerek öde", symbol: "checklist.checked", mode: .selectedItems, tip: Money(cents: tipCents))
                PaymentButton(title: "Tüm hesabı öde", symbol: "creditcard.fill", mode: .fullBill, tip: Money(cents: tipCents))
                Button {
                    store.selectedBillItemIDs = Set(store.unpaidBillItems.map(\.id))
                } label: {
                    Label("Kalan ürünleri seç", systemImage: "square.stack.3d.up.fill")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }

            if store.isProcessingPayment {
                ProgressView("Ödeme sağlayıcısı yanıtı bekleniyor")
            }
        }
        .padding()
        .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct PaymentButton: View {
    @Environment(PayliftDemoStore.self) private var store
    let title: String
    let symbol: String
    let mode: PaymentMode
    let tip: Money

    var body: some View {
        Button {
            Task { await store.pay(mode: mode, tip: tip) }
        } label: {
            Label(title, systemImage: symbol)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(store.isProcessingPayment)
    }
}

private struct SharedItemsCard: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Ortak ürünler")
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
                        Button("Eşit böl") {
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
        store.participants.first(where: { $0.id == id })?.displayName ?? "Misafir"
    }
}

private struct BillItemsSelectionCard: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Ödenmemiş kalemler")
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
                            Text(item.paymentStatus.rawValue)
                                .font(.caption)
                                .foregroundStyle(item.paymentStatus == .locked ? .orange : .secondary)
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
            let name = store.participants.first(where: { $0.id == share.participantID })?.displayName ?? "Misafir"
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
