import SwiftUI

struct CustomerHomeView: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    TableSessionHeader()

                    if !store.isJoinedToTable {
                        QRJoinCard()
                    }

                    MenuBrowserView()
                    CartSummaryView()
                    CustomerOrdersView()
                }
                .padding()
            }
            .background(Color.gray.opacity(0.08))
            .navigationTitle(store.business.name)
            .toolbar {
                ToolbarItem {
                    Toggle(isOn: $store.offlineMode) {
                        Image(systemName: store.offlineMode ? "wifi.slash" : "wifi")
                    }
                    .labelsHidden()
                    .accessibilityLabel("Offline modu")
                }
            }
        }
    }
}

private struct TableSessionHeader: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Masa \(store.table.number)")
                        .font(.largeTitle.bold())
                    Text("\(store.branch.name) • \(store.participants.filter { $0.role == .customer }.count) kişi")
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text(store.remainingTotal.formatted)
                        .font(.title2.bold())
                    Text("Kalan hesap")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Picker("Aktif müşteri", selection: Bindable(store).activeParticipantID) {
                ForEach(store.participants.filter { $0.role == .customer }) { participant in
                    Text(participant.displayName).tag(participant.id)
                }
            }
            .pickerStyle(.segmented)
        }
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct QRJoinCard: View {
    @Environment(PayliftDemoStore.self) private var store
    @State private var displayName = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("QR ile masaya katıl", systemImage: "qrcode.viewfinder")
                .font(.headline)
            Text("Demo akışında QR token doğrulandı: işletme, şube, masa ve kısa süreli oturum eşleşti.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack(spacing: 12) {
                TextField("Görünen ad", text: $displayName)
                    .textFieldStyle(.roundedBorder)
                Button {
                    store.joinTable(displayName: displayName)
                } label: {
                    Label("Katıl", systemImage: "checkmark.circle.fill")
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct MenuBrowserView: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        @Bindable var store = store
        VStack(alignment: .leading, spacing: 12) {
            Text("Menü")
                .font(.title2.bold())

            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(store.categories) { category in
                        Button {
                            store.selectedCategoryID = category.id
                        } label: {
                            Label(category.name, systemImage: category.symbolName)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.regular)
                        .tint(store.selectedCategoryID == category.id ? .accentColor : .secondary)
                    }
                }
            }

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 280), spacing: 12)], spacing: 12) {
                ForEach(store.filteredMenuItems) { item in
                    MenuItemCard(item: item)
                }
            }
        }
    }
}

private struct MenuItemCard: View {
    @Environment(PayliftDemoStore.self) private var store
    let item: MenuItem

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Image(systemName: item.isPopular ? "star.circle.fill" : "fork.knife.circle.fill")
                    .font(.title)
                    .foregroundStyle(item.isPopular ? .yellow : .accentColor)
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name)
                        .font(.headline)
                    Text(item.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Text(item.price.formatted)
                    .font(.headline)
            }

            HStack {
                ForEach(item.tags, id: \.self) { tag in
                    Text(tag)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.thinMaterial, in: Capsule())
                }
                if !item.allergens.isEmpty {
                    Label(item.allergens.joined(separator: ", "), systemImage: "exclamationmark.triangle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack {
                Label("\(item.preparationMinutes) dk", systemImage: "clock")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    store.addToCart(item)
                } label: {
                    Label("Sepete ekle", systemImage: "plus.circle.fill")
                }
                .buttonStyle(.borderedProminent)
                .disabled(!item.isAvailable)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct CartSummaryView: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Sepet")
                    .font(.title2.bold())
                Spacer()
                Text(store.cartTotal.formatted)
                    .font(.headline)
            }

            if store.cart.isEmpty {
                ContentUnavailableView("Sepet boş", systemImage: "cart", description: Text("Demo menüden ürün ekleyerek sipariş oluşturabilirsiniz."))
                    .frame(minHeight: 120)
            } else {
                ForEach(store.cart) { item in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(item.menuItem.name)
                                .font(.headline)
                            Text("\(item.quantity) adet • \(store.activeParticipant.displayName)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(item.total.formatted)
                        Button(role: .destructive) {
                            store.removeCartItem(item)
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.borderless)
                    }
                    Divider()
                }

                Button {
                    withAnimation(.snappy) {
                        store.submitCart()
                    }
                } label: {
                    Label("Siparişi gönder", systemImage: "paperplane.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct CustomerOrdersView: View {
    @Environment(PayliftDemoStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sipariş durumum")
                .font(.title2.bold())
            ForEach(store.orders.filter { $0.participantID == store.activeParticipantID }) { order in
                HStack {
                    Image(systemName: "progress.indicator")
                    VStack(alignment: .leading) {
                        Text(order.status.rawValue)
                            .font(.headline)
                        Text(order.items.map(\.name).joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(order.items.reduce(.zero) { $0 + $1.total }.formatted)
                        .font(.headline)
                }
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }
}
