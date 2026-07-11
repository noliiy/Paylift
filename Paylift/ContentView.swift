import SwiftUI

struct ContentView: View {
    @State private var store = PayliftDemoStore()

    var body: some View {
        PayliftRootView()
            .environment(store)
    }
}

private struct PayliftRootView: View {
    @Environment(PayliftDemoStore.self) private var store
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selectedSidebarItem: SidebarItem? = .customer

    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                NavigationSplitView {
                    List(SidebarItem.allCases, selection: $selectedSidebarItem) { item in
                        Label(item.title, systemImage: item.symbolName)
                    }
                    .navigationTitle("Paylift")
                } detail: {
                    detail(for: selectedSidebarItem ?? .customer)
                }
            } else {
                TabView {
                    CustomerHomeView()
                        .tabItem { Label("Customer", systemImage: "qrcode.viewfinder") }
                    StaffOrdersView()
                        .tabItem { Label("Orders", systemImage: "bell.badge") }
                    BillSplittingView()
                        .tabItem { Label("Bill", systemImage: "person.2.fill") }
                    DashboardView()
                        .tabItem { Label("Dashboard", systemImage: "chart.bar.xaxis") }
                }
            }
        }
        .overlay(alignment: .top) {
            if store.offlineMode {
                Text("Offline mode: changes sync when connection is restored.")
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(.orange.opacity(0.92), in: Capsule())
                    .foregroundStyle(.white)
                    .padding(.top, 8)
            }
        }
    }

    @ViewBuilder
    private func detail(for item: SidebarItem) -> some View {
        switch item {
        case .customer:
            CustomerHomeView()
        case .orders:
            StaffOrdersView()
        case .bill:
            BillSplittingView()
        case .dashboard:
            DashboardView()
        }
    }
}

private enum SidebarItem: String, CaseIterable, Identifiable {
    case customer
    case orders
    case bill
    case dashboard

    var id: String { rawValue }

    var title: String {
        switch self {
        case .customer: "Customer flow"
        case .orders: "Order management"
        case .bill: "Bill splitting"
        case .dashboard: "Business dashboard"
        }
    }

    var symbolName: String {
        switch self {
        case .customer: "person.crop.circle.badge.checkmark"
        case .orders: "list.clipboard"
        case .bill: "shared.with.you"
        case .dashboard: "rectangle.3.group"
        }
    }
}

#Preview {
    ContentView()
}
