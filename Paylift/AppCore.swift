import Foundation
import Observation

typealias PayliftID = UUID

struct Money: Codable, Hashable, Comparable, Sendable {
    var cents: Int
    init(cents: Int) { self.cents = cents }
    init(amount: Double) { cents = Int((amount * 100).rounded()) }
    static let zero = Money(cents: 0)

    var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "TRY"
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: Double(cents) / 100)) ?? "₺0.00"
    }

    static func + (lhs: Money, rhs: Money) -> Money { Money(cents: lhs.cents + rhs.cents) }
    static func - (lhs: Money, rhs: Money) -> Money { Money(cents: lhs.cents - rhs.cents) }
    static func * (lhs: Money, rhs: Int) -> Money { Money(cents: lhs.cents * rhs) }
    static func / (lhs: Money, rhs: Int) -> Money { rhs > 0 ? Money(cents: lhs.cents / rhs) : .zero }
    static func < (lhs: Money, rhs: Money) -> Bool { lhs.cents < rhs.cents }
}

enum UserRole: String, Codable, CaseIterable, Identifiable {
    case customer = "Customer"
    case staff = "Staff"
    case owner = "Manager"
    var id: String { rawValue }
}

enum OrderStatus: String, Codable, CaseIterable, Identifiable {
    case draft = "Draft"
    case pendingApproval = "Pending approval"
    case approved = "Approved"
    case preparing = "Preparing"
    case ready = "Ready"
    case served = "Served"
    case cancelled = "Cancelled"
    case refunded = "Refunded"
    var id: String { rawValue }
}

enum BillItemStatus: String, Codable, CaseIterable, Identifiable {
    case unpaid = "Unpaid"
    case partiallyPaid = "Partially paid"
    case paid = "Paid at POS"
    var id: String { rawValue }
}

struct Business: Identifiable, Codable, Hashable { let id: PayliftID; var name: String; var taxLabel: String }
struct Branch: Identifiable, Codable, Hashable { let id: PayliftID; var businessID: PayliftID; var name: String; var address: String }
struct RestaurantTable: Identifiable, Codable, Hashable { let id: PayliftID; var branchID: PayliftID; var number: String; var capacity: Int; var status: String }
struct TableSession: Identifiable, Codable, Hashable { let id: PayliftID; var tableID: PayliftID; var secureToken: String; var startedAt: Date; var isOpen: Bool }
struct Participant: Identifiable, Codable, Hashable {
    let id: PayliftID
    var displayName: String
    var role: UserRole
    var seatLabel: String
    var isSignedIn: Bool
    var remoteId: String?
}
struct MenuCategory: Identifiable, Codable, Hashable { let id: PayliftID; var name: String; var symbolName: String }
struct MenuItemOption: Identifiable, Codable, Hashable { let id: PayliftID; var name: String; var priceDelta: Money }

struct MenuItem: Identifiable, Codable, Hashable {
    let id: PayliftID
    var categoryID: PayliftID
    var name: String
    var description: String
    var price: Money
    var allergens: [String]
    var tags: [String]
    var spiceLevel: Int
    var preparationMinutes: Int
    var isPopular: Bool
    var isAvailable: Bool
    var options: [MenuItemOption]
}

struct CartItem: Identifiable, Codable, Hashable {
    let id: PayliftID
    var menuItem: MenuItem
    var quantity: Int
    var ownerID: PayliftID
    var note: String
    var selectedOptions: [MenuItemOption]
    var unitPrice: Money { selectedOptions.reduce(menuItem.price) { $0 + $1.priceDelta } }
    var total: Money { unitPrice * quantity }
}

struct Order: Identifiable, Codable, Hashable {
    let id: PayliftID
    var sessionID: PayliftID
    var participantID: PayliftID
    var staffID: PayliftID?
    var status: OrderStatus
    var createdAt: Date
    var note: String
    var items: [OrderItem]
}

struct OrderItem: Identifiable, Codable, Hashable {
    let id: PayliftID
    var menuItemID: PayliftID
    var name: String
    var quantity: Int
    var unitPrice: Money
    var taxRate: Double
    var ownerShares: [OrderItemOwnerShare]
    var billStatus: BillItemStatus
    var total: Money { unitPrice * quantity }
    var paidCents: Int { ownerShares.reduce(0) { $0 + ($1.isPaid ? $1.amount.cents : 0) } }
    var remaining: Money { Money(cents: max(0, total.cents - paidCents)) }
}

struct OrderItemOwnerShare: Identifiable, Codable, Hashable {
    let id: PayliftID
    var participantID: PayliftID
    var amount: Money
    var isPaid: Bool
}

struct DailySalesSummary: Codable, Hashable {
    var revenue: Money
    var tips: Money
    var openTables: Int
    var pendingOrders: Int
    var averageTicket: Money
    var topProducts: [String]
}

@MainActor
@Observable
final class PayliftDemoStore {
    var business: Business
    var branch: Branch
    var table: RestaurantTable
    var session: TableSession
    var participants: [Participant]
    var categories: [MenuCategory]
    var menuItems: [MenuItem]
    var orders: [Order]
    var cart: [CartItem] = []
    var activeParticipantID: PayliftID
    var selectedCategoryID: PayliftID?
    var selectedBillItemIDs: Set<PayliftID> = []
    var isJoinedToTable = false
    var offlineMode = false
    var usesLiveAPI = false
    var authMessage: String?
    var isAuthenticating = false
    var signedInDisplayName: String?
    var authProvider: AuthProvider?

    private let auth = AuthService.shared
    private let sessionAPI = TableSessionAPI.shared
    private let ordersAPI = OrdersAPI.shared

    init() {
        let demo = DemoData.make()
        business = demo.business
        branch = demo.branch
        table = demo.table
        session = demo.session
        participants = demo.participants
        categories = demo.categories
        menuItems = demo.menuItems
        orders = demo.orders
        activeParticipantID = demo.participants[0].id
        selectedCategoryID = demo.categories.first?.id
    }

    var activeParticipant: Participant { participants.first { $0.id == activeParticipantID } ?? participants[0] }
    var filteredMenuItems: [MenuItem] { selectedCategoryID.map { id in menuItems.filter { $0.categoryID == id } } ?? menuItems }
    var cartTotal: Money { cart.reduce(.zero) { $0 + $1.total } }
    var billItems: [OrderItem] { orders.flatMap(\.items) }
    var unpaidBillItems: [OrderItem] { billItems.filter { $0.remaining.cents > 0 && $0.billStatus != .paid } }
    var billTotal: Money { billItems.reduce(.zero) { $0 + $1.total } }
    var remainingTotal: Money { unpaidBillItems.reduce(.zero) { $0 + $1.remaining } }
    var dailySummary: DailySalesSummary {
        DailySalesSummary(
            revenue: Money(amount: 18420) + remainingTotal,
            tips: Money(amount: 1220),
            openTables: 14,
            pendingOrders: orders.filter { $0.status == .pendingApproval }.count + 6,
            averageTicket: Money(amount: 685),
            topProducts: ["Truffle Burger", "Lemonade", "San Sebastian"]
        )
    }

    func signInWithApple(displayName: String) async {
        await performSignIn(provider: .apple, displayName: displayName) {
            try await auth.signInWithApple(displayName: displayName, identityToken: "demo-apple-\(displayName.lowercased())")
        }
    }

    func signInWithGoogle(displayName: String) async {
        await performSignIn(provider: .google, displayName: displayName) {
            try await auth.signInWithGoogle(displayName: displayName, identityToken: "demo-google-\(displayName.lowercased())")
        }
    }

    private func performSignIn(provider: AuthProvider, displayName: String, action: () async throws -> Void) async {
        isAuthenticating = true
        authMessage = nil
        do {
            try await action()
            authProvider = provider
            signedInDisplayName = displayName
            authMessage = "Signed in with \(provider.rawValue.capitalized)."
            usesLiveAPI = true
        } catch {
            authMessage = error.localizedDescription
            usesLiveAPI = false
        }
        isAuthenticating = false
    }

    func joinTable(displayName: String) {
        let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        signedInDisplayName = name

        let participant = Participant(
            id: UUID(),
            displayName: name,
            role: .customer,
            seatLabel: "Seat \(participants.filter { $0.role == .customer }.count + 1)",
            isSignedIn: auth.isSignedIn,
            remoteId: auth.currentUserId
        )
        participants.append(participant)
        activeParticipantID = participant.id
        isJoinedToTable = true

        if usesLiveAPI {
            Task { await joinRemoteSession(displayName: name) }
        }
    }

    private func joinRemoteSession(displayName: String) async {
        do {
            let response = try await sessionAPI.joinSession(sessionId: session.id.uuidString, displayName: displayName)
            if let index = participants.firstIndex(where: { $0.id == activeParticipantID }) {
                participants[index].remoteId = response.id
            }
        } catch {
            authMessage = "Joined locally. API: \(error.localizedDescription)"
        }
    }

    func addToCart(_ item: MenuItem) {
        guard item.isAvailable else { return }
        if let index = cart.firstIndex(where: { $0.menuItem.id == item.id && $0.ownerID == activeParticipantID }) {
            cart[index].quantity += 1
        } else {
            cart.append(CartItem(id: UUID(), menuItem: item, quantity: 1, ownerID: activeParticipantID, note: "", selectedOptions: []))
        }
    }

    func removeCartItem(_ item: CartItem) { cart.removeAll { $0.id == item.id } }

    func submitCart() {
        guard !cart.isEmpty else { return }
        if usesLiveAPI {
            Task { await submitCartToAPI() }
            return
        }
        insertLocalOrder(note: "Mobile order")
        cart.removeAll()
    }

    private func submitCartToAPI() async {
        let items = cart.map { CreateOrderItemRequest(menuItemId: $0.menuItem.id.uuidString, quantity: $0.quantity, note: $0.note) }
        do {
            _ = try await ordersAPI.createOrder(sessionId: session.id.uuidString, items: items, note: "Mobile order")
            insertLocalOrder(note: "Mobile order")
            cart.removeAll()
        } catch {
            authMessage = "Order failed: \(error.localizedDescription)"
        }
    }

    private func insertLocalOrder(note: String) {
        let orderItems = cart.map { cartItem in
            OrderItem(
                id: UUID(),
                menuItemID: cartItem.menuItem.id,
                name: cartItem.menuItem.name,
                quantity: cartItem.quantity,
                unitPrice: cartItem.unitPrice,
                taxRate: 0.10,
                ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: cartItem.ownerID, amount: cartItem.total, isPaid: false)],
                billStatus: .unpaid
            )
        }
        orders.insert(
            Order(id: UUID(), sessionID: session.id, participantID: activeParticipantID, staffID: nil, status: .pendingApproval, createdAt: Date(), note: note, items: orderItems),
            at: 0
        )
    }

    func advanceOrderStatus(_ order: Order) {
        guard let index = orders.firstIndex(where: { $0.id == order.id }) else { return }
        switch orders[index].status {
        case .draft: orders[index].status = .pendingApproval
        case .pendingApproval: orders[index].status = .approved
        case .approved: orders[index].status = .preparing
        case .preparing: orders[index].status = .ready
        case .ready: orders[index].status = .served
        case .served, .cancelled, .refunded: break
        }
    }

    func splitItemEqually(_ item: OrderItem, between participantIDs: [PayliftID]) {
        guard !participantIDs.isEmpty else { return }
        mutateOrderItem(item.id) { orderItem in
            let base = orderItem.total.cents / participantIDs.count
            let remainder = orderItem.total.cents % participantIDs.count
            orderItem.ownerShares = participantIDs.enumerated().map { index, participantID in
                OrderItemOwnerShare(id: UUID(), participantID: participantID, amount: Money(cents: base + (index == 0 ? remainder : 0)), isPaid: false)
            }
        }
        if usesLiveAPI {
            Task {
                try? await BillAPI.shared.splitItemEqually(
                    sessionId: session.id.uuidString,
                    orderItemId: item.id.uuidString,
                    participantIds: participantIDs.map(\.uuidString)
                )
            }
        }
    }

    func toggleBillSelection(_ item: OrderItem) {
        if selectedBillItemIDs.contains(item.id) { selectedBillItemIDs.remove(item.id) } else { selectedBillItemIDs.insert(item.id) }
    }

    private func mutateOrderItem(_ itemID: PayliftID, change: (inout OrderItem) -> Void) {
        for orderIndex in orders.indices {
            if let itemIndex = orders[orderIndex].items.firstIndex(where: { $0.id == itemID }) {
                change(&orders[orderIndex].items[itemIndex])
                return
            }
        }
    }
}

struct DemoData {
    let business: Business
    let branch: Branch
    let table: RestaurantTable
    let session: TableSession
    let participants: [Participant]
    let categories: [MenuCategory]
    let menuItems: [MenuItem]
    let orders: [Order]

    static func make() -> DemoData {
        let businessID = UUID()
        let branchID = UUID()
        let tableID = UUID()
        let sessionID = UUID()
        let emre = Participant(id: UUID(), displayName: "Emre", role: .customer, seatLabel: "Seat 1", isSignedIn: true, remoteId: nil)
        let deniz = Participant(id: UUID(), displayName: "Deniz", role: .customer, seatLabel: "Seat 2", isSignedIn: false, remoteId: nil)
        let guest = Participant(id: UUID(), displayName: "Guest 3", role: .customer, seatLabel: "Seat 3", isSignedIn: false, remoteId: nil)
        let waiter = Participant(id: UUID(), displayName: "Ayse", role: .staff, seatLabel: "Floor", isSignedIn: false, remoteId: nil)

        let main = MenuCategory(id: UUID(), name: "Mains", symbolName: "fork.knife")
        let shared = MenuCategory(id: UUID(), name: "Sharing", symbolName: "person.2.fill")
        let drinks = MenuCategory(id: UUID(), name: "Drinks", symbolName: "cup.and.saucer.fill")
        let desserts = MenuCategory(id: UUID(), name: "Desserts", symbolName: "birthday.cake.fill")

        let burger = MenuItem(id: UUID(), categoryID: main.id, name: "Truffle Burger", description: "Beef patty, truffle aioli, caramelized onion.", price: Money(amount: 420), allergens: ["Gluten", "Dairy"], tags: ["Popular"], spiceLevel: 1, preparationMinutes: 18, isPopular: true, isAvailable: true, options: [MenuItemOption(id: UUID(), name: "Extra cheddar", priceDelta: Money(amount: 35))])
        let pasta = MenuItem(id: UUID(), categoryID: main.id, name: "Basil Pasta", description: "Fresh pesto, parmesan, cherry tomatoes.", price: Money(amount: 310), allergens: ["Gluten", "Dairy", "Nuts"], tags: ["Vegetarian"], spiceLevel: 0, preparationMinutes: 14, isPopular: false, isAvailable: true, options: [])
        let meze = MenuItem(id: UUID(), categoryID: shared.id, name: "Mixed Meze Platter", description: "Hummus, ezme, artichoke, warm pide.", price: Money(amount: 360), allergens: ["Sesame", "Gluten"], tags: ["Sharing"], spiceLevel: 2, preparationMinutes: 10, isPopular: true, isAvailable: true, options: [])
        let lemonade = MenuItem(id: UUID(), categoryID: drinks.id, name: "House Lemonade", description: "Fresh lemon and mint.", price: Money(amount: 120), allergens: [], tags: ["Cold"], spiceLevel: 0, preparationMinutes: 3, isPopular: true, isAvailable: true, options: [])
        let coffee = MenuItem(id: UUID(), categoryID: drinks.id, name: "Filter Coffee", description: "Single-origin daily roast.", price: Money(amount: 95), allergens: [], tags: ["Hot"], spiceLevel: 0, preparationMinutes: 5, isPopular: false, isAvailable: true, options: [])
        let cake = MenuItem(id: UUID(), categoryID: desserts.id, name: "San Sebastian", description: "Served with dark chocolate sauce.", price: Money(amount: 240), allergens: ["Egg", "Dairy"], tags: ["Shareable"], spiceLevel: 0, preparationMinutes: 4, isPopular: true, isAvailable: true, options: [])

        let mezeShare = meze.price.cents / 3
        let orders = [
            Order(id: UUID(), sessionID: sessionID, participantID: emre.id, staffID: waiter.id, status: .preparing, createdAt: Date().addingTimeInterval(-1600), note: "Less onion", items: [
                OrderItem(id: UUID(), menuItemID: burger.id, name: burger.name, quantity: 1, unitPrice: burger.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: emre.id, amount: burger.price, isPaid: false)], billStatus: .unpaid),
                OrderItem(id: UUID(), menuItemID: lemonade.id, name: lemonade.name, quantity: 1, unitPrice: lemonade.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: emre.id, amount: lemonade.price, isPaid: false)], billStatus: .unpaid)
            ]),
            Order(id: UUID(), sessionID: sessionID, participantID: deniz.id, staffID: waiter.id, status: .served, createdAt: Date().addingTimeInterval(-1200), note: "", items: [
                OrderItem(id: UUID(), menuItemID: pasta.id, name: pasta.name, quantity: 1, unitPrice: pasta.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: deniz.id, amount: pasta.price, isPaid: false)], billStatus: .unpaid),
                OrderItem(id: UUID(), menuItemID: meze.id, name: meze.name, quantity: 1, unitPrice: meze.price, taxRate: 0.10, ownerShares: [
                    OrderItemOwnerShare(id: UUID(), participantID: emre.id, amount: Money(cents: mezeShare), isPaid: false),
                    OrderItemOwnerShare(id: UUID(), participantID: deniz.id, amount: Money(cents: mezeShare), isPaid: false),
                    OrderItemOwnerShare(id: UUID(), participantID: guest.id, amount: Money(cents: meze.price.cents - mezeShare * 2), isPaid: false)
                ], billStatus: .unpaid)
            ]),
            Order(id: UUID(), sessionID: sessionID, participantID: guest.id, staffID: nil, status: .pendingApproval, createdAt: Date().addingTimeInterval(-420), note: "Dessert for the table", items: [
                OrderItem(id: UUID(), menuItemID: cake.id, name: cake.name, quantity: 1, unitPrice: cake.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: guest.id, amount: cake.price, isPaid: false)], billStatus: .unpaid)
            ])
        ]

        return DemoData(
            business: Business(id: businessID, name: "Paylift Demo Bistro", taxLabel: "End of Day Sales Summary"),
            branch: Branch(id: branchID, businessID: businessID, name: "Nisantasi Branch", address: "Demo St. No: 12, Istanbul"),
            table: RestaurantTable(id: tableID, branchID: branchID, number: "12", capacity: 6, status: "Active"),
            session: TableSession(id: sessionID, tableID: tableID, secureToken: "qr_demo_5m_signed_token", startedAt: Date().addingTimeInterval(-2700), isOpen: true),
            participants: [emre, deniz, guest, waiter],
            categories: [main, shared, drinks, desserts],
            menuItems: [burger, pasta, meze, lemonade, coffee, cake],
            orders: orders
        )
    }
}
