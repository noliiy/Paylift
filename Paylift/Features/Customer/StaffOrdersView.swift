import SwiftUI

struct StaffOrdersView: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        NavigationStack {
            List {
                Section("Masa durumu") {
                    HStack {
                        Label("Masa \(store.table.number)", systemImage: "table.furniture")
                        Spacer()
                        Text(store.remainingTotal.formatted)
                            .font(.headline)
                    }
                    HStack {
                        Label("Ödenen", systemImage: "checkmark.seal")
                        Spacer()
                        Text(store.paidTotal.formatted)
                    }
                }

                Section("Aktif siparişler") {
                    ForEach(store.orders) { order in
                        StaffOrderRow(order: order)
                    }
                }
            }
            .navigationTitle("Sipariş yönetimi")
        }
    }
}

private struct StaffOrderRow: View {
    @Environment(PayliftDemoStore.self) private var store
    let order: Order

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(participantName(order.participantID))
                        .font(.headline)
                    Text(order.items.map { "\($0.quantity)x \($0.name)" }.joined(separator: ", "))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(order.status.rawValue)
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(statusColor.opacity(0.16), in: Capsule())
                    .foregroundStyle(statusColor)
            }

            if !order.note.isEmpty {
                Label(order.note, systemImage: "text.bubble")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack {
                Text(order.createdAt, style: .time)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    withAnimation(.snappy) {
                        store.advanceOrderStatus(order)
                    }
                } label: {
                    Label("Durumu ilerlet", systemImage: "arrow.forward.circle")
                }
                .buttonStyle(.bordered)
                .disabled(order.status == .served || order.status == .cancelled || order.status == .refunded)
            }
        }
        .padding(.vertical, 6)
    }

    private var statusColor: Color {
        switch order.status {
        case .pendingApproval: .orange
        case .approved, .preparing: .blue
        case .ready: .green
        case .served: .secondary
        case .cancelled, .refunded: .red
        case .draft: .gray
        }
    }

    private func participantName(_ id: PayliftID) -> String {
        store.participants.first(where: { $0.id == id })?.displayName ?? "Misafir"
    }
}
