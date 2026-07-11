import Foundation
import Observation

typealias PayliftID = UUID

struct Money: Codable, Hashable, Comparable, Sendable {
    var cents: Int
    init(cents: Int) { self.cents = cents }
    init(lira: Double) { cents = Int((lira * 100).rounded()) }
    static let zero = Money(cents: 0)

    var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "TRY"
        formatter.locale = Locale(identifier: "tr_TR")
        return formatter.string(from: NSNumber(value: Double(cents) / 100)) ?? "₺0,00"
    }

    static func + (lhs: Money, rhs: Money) -> Money { Money(cents: lhs.cents + rhs.cents) }
    static func - (lhs: Money, rhs: Money) -> Money { Money(cents: lhs.cents - rhs.cents) }
    static func * (lhs: Money, rhs: Int) -> Money { Money(cents: lhs.cents * rhs) }
    static func / (lhs: Money, rhs: Int) -> Money { rhs > 0 ? Money(cents: lhs.cents / rhs) : .zero }
    static func < (lhs: Money, rhs: Money) -> Bool { lhs.cents < rhs.cents }
}

enum UserRole: String, Codable, CaseIterable, Identifiable {
    case customer = "Müşteri"
    case staff = "Çalışan"
    case owner = "Yönetici"
    var id: String { rawValue }
}

enum OrderStatus: String, Codable, CaseIterable, Identifiable {
    case draft = "Taslak"
    case pendingApproval = "Onay bekliyor"
    case approved = "Onaylandı"
    case preparing = "Hazırlanıyor"
    case ready = "Hazır"
    case served = "Servis edildi"
    case cancelled = "İptal edildi"
    case refunded = "İade edildi"
    var id: String { rawValue }
}

enum PaymentStatus: String, Codable, CaseIterable, Identifiable {
    case unpaid = "Ödenmedi"
    case locked = "Ödeme kilidi"
    case pending = "Bekliyor"
    case paid = "Ödendi"
    case failed = "Başarısız"
    case refunded = "İade edildi"
    var id: String { rawValue }
}

enum PaymentMode: String, Codable, CaseIterable, Identifiable {
    case ownItems = "Kendi siparişlerim"
    case selectedItems = "Ürün seçerek öde"
    case equalSplit = "Eşit böl"
    case customAmount = "Tutar öde"
    case fullBill = "Tüm hesabı öde"
    var id: String { rawValue }
}

struct Business: Identifiable, Codable, Hashable { let id: PayliftID; var name: String; var taxLabel: String }
struct Branch: Identifiable, Codable, Hashable { let id: PayliftID; var businessID: PayliftID; var name: String; var address: String }
struct RestaurantTable: Identifiable, Codable, Hashable { let id: PayliftID; var branchID: PayliftID; var number: String; var capacity: Int; var status: String }
struct TableSession: Identifiable, Codable, Hashable { let id: PayliftID; var tableID: PayliftID; var secureToken: String; var startedAt: Date; var isOpen: Bool }
struct Participant: Identifiable, Codable, Hashable { let id: PayliftID; var displayName: String; var role: UserRole; var seatLabel: String; var isSignedInWithApple: Bool }
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
    var paymentStatus: PaymentStatus
    var lockedByPaymentID: PayliftID?
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

struct PaymentAllocation: Identifiable, Codable, Hashable {
    let id: PayliftID
    var orderItemID: PayliftID
    var participantID: PayliftID
    var amount: Money
}

struct Payment: Identifiable, Codable, Hashable {
    let id: PayliftID
    var sessionID: PayliftID
    var payerID: PayliftID
    var mode: PaymentMode
    var amount: Money
    var tip: Money
    var status: PaymentStatus
    var idempotencyKey: String
    var allocations: [PaymentAllocation]
    var createdAt: Date
}

struct DailySalesSummary: Codable, Hashable {
    var revenue: Money
    var tips: Money
    var openTables: Int
    var pendingOrders: Int
    var averageTicket: Money
    var topProducts: [String]
}

protocol PaymentServicing {
    func authorizePayment(amount: Money, idempotencyKey: String) async throws -> PaymentStatus
}

struct MockPaymentService: PaymentServicing {
    func authorizePayment(amount: Money, idempotencyKey: String) async throws -> PaymentStatus {
        try await Task.sleep(for: .milliseconds(250))
        return amount.cents > 0 ? .paid : .failed
    }
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
    var payments: [Payment] = []
    var cart: [CartItem] = []
    var activeParticipantID: PayliftID
    var selectedCategoryID: PayliftID?
    var selectedBillItemIDs: Set<PayliftID> = []
    var isJoinedToTable = false
    var paymentMessage: String?
    var isProcessingPayment = false
    var offlineMode = false

    private let paymentService: PaymentServicing

    init(paymentService: PaymentServicing = MockPaymentService()) {
        self.paymentService = paymentService
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
    var unpaidBillItems: [OrderItem] { billItems.filter { $0.remaining.cents > 0 && $0.paymentStatus != .paid } }
    var billTotal: Money { billItems.reduce(.zero) { $0 + $1.total } }
    var paidTotal: Money { payments.filter { $0.status == .paid }.reduce(.zero) { $0 + $1.amount + $1.tip } }
    var remainingTotal: Money { unpaidBillItems.reduce(.zero) { $0 + $1.remaining } }
    var dailySummary: DailySalesSummary {
        DailySalesSummary(revenue: paidTotal + Money(lira: 18420), tips: payments.reduce(.zero) { $0 + $1.tip } + Money(lira: 1220), openTables: 14, pendingOrders: orders.filter { $0.status == .pendingApproval }.count + 6, averageTicket: Money(lira: 685), topProducts: ["Trüf Burger", "Limonata", "San Sebastian"])
    }

    func joinTable(displayName: String) {
        let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !name.isEmpty {
            let participant = Participant(id: UUID(), displayName: name, role: .customer, seatLabel: "Koltuk \(participants.count + 1)", isSignedInWithApple: false)
            participants.append(participant)
            activeParticipantID = participant.id
        }
        isJoinedToTable = true
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
        let orderItems = cart.map { cartItem in
            OrderItem(id: UUID(), menuItemID: cartItem.menuItem.id, name: cartItem.menuItem.name, quantity: cartItem.quantity, unitPrice: cartItem.unitPrice, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: cartItem.ownerID, amount: cartItem.total, isPaid: false)], paymentStatus: .unpaid, lockedByPaymentID: nil)
        }
        orders.insert(Order(id: UUID(), sessionID: session.id, participantID: activeParticipantID, staffID: nil, status: .pendingApproval, createdAt: Date(), note: "Mobil sipariş", items: orderItems), at: 0)
        cart.removeAll()
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

    func allocationsForOwnItems() -> [PaymentAllocation] {
        unpaidBillItems.flatMap { item in
            item.ownerShares.filter { $0.participantID == activeParticipantID && !$0.isPaid }.map { PaymentAllocation(id: UUID(), orderItemID: item.id, participantID: activeParticipantID, amount: $0.amount) }
        }
    }

    func allocationsForSelectedItems() -> [PaymentAllocation] {
        unpaidBillItems.filter { selectedBillItemIDs.contains($0.id) }.map { PaymentAllocation(id: UUID(), orderItemID: $0.id, participantID: activeParticipantID, amount: $0.remaining) }
    }

    func allocationsForFullBill() -> [PaymentAllocation] {
        unpaidBillItems.map { PaymentAllocation(id: UUID(), orderItemID: $0.id, participantID: activeParticipantID, amount: $0.remaining) }
    }

    func pay(mode: PaymentMode, tip: Money = .zero) async {
        let allocations: [PaymentAllocation]
        switch mode {
        case .ownItems: allocations = allocationsForOwnItems()
        case .selectedItems: allocations = allocationsForSelectedItems()
        case .fullBill, .equalSplit, .customAmount: allocations = allocationsForFullBill()
        }
        let amount = allocations.reduce(.zero) { $0 + $1.amount }
        guard amount.cents > 0 else { paymentMessage = "Ödenecek uygun kalem bulunamadı."; return }

        let paymentID = UUID()
        guard lockItems(for: allocations, paymentID: paymentID) else {
            paymentMessage = "Seçilen ürünlerden biri şu anda başka bir ödeme işleminde."
            return
        }

        isProcessingPayment = true
        let idempotencyKey = "paylift-\(paymentID.uuidString)"
        var payment = Payment(id: paymentID, sessionID: session.id, payerID: activeParticipantID, mode: mode, amount: amount, tip: tip, status: .pending, idempotencyKey: idempotencyKey, allocations: allocations, createdAt: Date())
        payments.append(payment)

        do {
            let status = try await paymentService.authorizePayment(amount: amount + tip, idempotencyKey: idempotencyKey)
            payment.status = status
            updatePayment(payment)
            if status == .paid {
                markAllocationsPaid(allocations, paymentID: paymentID)
                selectedBillItemIDs.removeAll()
                paymentMessage = "Ödeme alındı: \((amount + tip).formatted)"
            } else {
                unlockItems(paymentID: paymentID)
                paymentMessage = "Ödeme başarısız oldu. Tekrar deneyebilirsiniz."
            }
        } catch {
            payment.status = .failed
            updatePayment(payment)
            unlockItems(paymentID: paymentID)
            paymentMessage = "Ödeme sağlayıcısına ulaşılamadı."
        }
        isProcessingPayment = false
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
    }

    func toggleBillSelection(_ item: OrderItem) {
        if selectedBillItemIDs.contains(item.id) { selectedBillItemIDs.remove(item.id) } else { selectedBillItemIDs.insert(item.id) }
    }

    private func lockItems(for allocations: [PaymentAllocation], paymentID: PayliftID) -> Bool {
        for allocation in allocations {
            guard let item = billItems.first(where: { $0.id == allocation.orderItemID }) else { continue }
            if item.paymentStatus == .locked, item.lockedByPaymentID != paymentID { return false }
        }
        for allocation in allocations {
            mutateOrderItem(allocation.orderItemID) { item in
                item.paymentStatus = .locked
                item.lockedByPaymentID = paymentID
            }
        }
        return true
    }

    private func unlockItems(paymentID: PayliftID) {
        for item in billItems where item.lockedByPaymentID == paymentID {
            mutateOrderItem(item.id) { orderItem in
                orderItem.paymentStatus = .unpaid
                orderItem.lockedByPaymentID = nil
            }
        }
    }

    private func markAllocationsPaid(_ allocations: [PaymentAllocation], paymentID: PayliftID) {
        for allocation in allocations {
            mutateOrderItem(allocation.orderItemID) { item in
                if allocation.amount.cents >= item.remaining.cents {
                    item.ownerShares = item.ownerShares.map { share in
                        var paidShare = share
                        paidShare.isPaid = true
                        return paidShare
                    }
                    item.paymentStatus = .paid
                } else {
                    for index in item.ownerShares.indices where item.ownerShares[index].participantID == allocation.participantID {
                        item.ownerShares[index].isPaid = true
                    }
                    item.paymentStatus = item.ownerShares.allSatisfy(\.isPaid) ? .paid : .unpaid
                }
                item.lockedByPaymentID = nil
            }
        }
    }

    private func updatePayment(_ payment: Payment) {
        guard let index = payments.firstIndex(where: { $0.id == payment.id }) else { return }
        payments[index] = payment
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
        let emre = Participant(id: UUID(), displayName: "Emre", role: .customer, seatLabel: "Koltuk 1", isSignedInWithApple: true)
        let deniz = Participant(id: UUID(), displayName: "Deniz", role: .customer, seatLabel: "Koltuk 2", isSignedInWithApple: false)
        let guest = Participant(id: UUID(), displayName: "Misafir 3", role: .customer, seatLabel: "Koltuk 3", isSignedInWithApple: false)
        let waiter = Participant(id: UUID(), displayName: "Ayşe", role: .staff, seatLabel: "Salon", isSignedInWithApple: false)

        let main = MenuCategory(id: UUID(), name: "Ana Yemek", symbolName: "fork.knife")
        let shared = MenuCategory(id: UUID(), name: "Paylaşım", symbolName: "person.2.fill")
        let drinks = MenuCategory(id: UUID(), name: "İçecek", symbolName: "cup.and.saucer.fill")
        let desserts = MenuCategory(id: UUID(), name: "Tatlı", symbolName: "birthday.cake.fill")

        let burger = MenuItem(id: UUID(), categoryID: main.id, name: "Trüf Burger", description: "Dana köfte, trüf aioli, karamelize soğan ve cheddar.", price: Money(lira: 420), allergens: ["Gluten", "Süt"], tags: ["Popüler"], spiceLevel: 1, preparationMinutes: 18, isPopular: true, isAvailable: true, options: [MenuItemOption(id: UUID(), name: "Ekstra cheddar", priceDelta: Money(lira: 35))])
        let pasta = MenuItem(id: UUID(), categoryID: main.id, name: "Fesleğenli Makarna", description: "Taze pesto, parmesan ve cherry domates.", price: Money(lira: 310), allergens: ["Gluten", "Süt", "Kuruyemiş"], tags: ["Vejetaryen"], spiceLevel: 0, preparationMinutes: 14, isPopular: false, isAvailable: true, options: [])
        let meze = MenuItem(id: UUID(), categoryID: shared.id, name: "Ortaya Karışık Meze", description: "Humus, acılı ezme, atom ve sıcak pide.", price: Money(lira: 360), allergens: ["Susam", "Gluten"], tags: ["Ortak"], spiceLevel: 2, preparationMinutes: 10, isPopular: true, isAvailable: true, options: [])
        let lemonade = MenuItem(id: UUID(), categoryID: drinks.id, name: "Ev Yapımı Limonata", description: "Taze limon, nane ve düşük şeker.", price: Money(lira: 120), allergens: [], tags: ["Soğuk"], spiceLevel: 0, preparationMinutes: 3, isPopular: true, isAvailable: true, options: [])
        let coffee = MenuItem(id: UUID(), categoryID: drinks.id, name: "Filtre Kahve", description: "Günlük tek köken çekirdek.", price: Money(lira: 95), allergens: [], tags: ["Sıcak"], spiceLevel: 0, preparationMinutes: 5, isPopular: false, isAvailable: true, options: [])
        let cake = MenuItem(id: UUID(), categoryID: desserts.id, name: "San Sebastian", description: "Bitter çikolata sos ile servis edilir.", price: Money(lira: 240), allergens: ["Yumurta", "Süt"], tags: ["Paylaşılabilir"], spiceLevel: 0, preparationMinutes: 4, isPopular: true, isAvailable: true, options: [])

        let mezeShare = meze.price.cents / 3
        let orders = [
            Order(id: UUID(), sessionID: sessionID, participantID: emre.id, staffID: waiter.id, status: .preparing, createdAt: Date().addingTimeInterval(-1600), note: "Soğan az olsun", items: [
                OrderItem(id: UUID(), menuItemID: burger.id, name: burger.name, quantity: 1, unitPrice: burger.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: emre.id, amount: burger.price, isPaid: false)], paymentStatus: .unpaid, lockedByPaymentID: nil),
                OrderItem(id: UUID(), menuItemID: lemonade.id, name: lemonade.name, quantity: 1, unitPrice: lemonade.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: emre.id, amount: lemonade.price, isPaid: false)], paymentStatus: .unpaid, lockedByPaymentID: nil)
            ]),
            Order(id: UUID(), sessionID: sessionID, participantID: deniz.id, staffID: waiter.id, status: .served, createdAt: Date().addingTimeInterval(-1200), note: "", items: [
                OrderItem(id: UUID(), menuItemID: pasta.id, name: pasta.name, quantity: 1, unitPrice: pasta.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: deniz.id, amount: pasta.price, isPaid: false)], paymentStatus: .unpaid, lockedByPaymentID: nil),
                OrderItem(id: UUID(), menuItemID: meze.id, name: meze.name, quantity: 1, unitPrice: meze.price, taxRate: 0.10, ownerShares: [
                    OrderItemOwnerShare(id: UUID(), participantID: emre.id, amount: Money(cents: mezeShare), isPaid: false),
                    OrderItemOwnerShare(id: UUID(), participantID: deniz.id, amount: Money(cents: mezeShare), isPaid: false),
                    OrderItemOwnerShare(id: UUID(), participantID: guest.id, amount: Money(cents: meze.price.cents - mezeShare * 2), isPaid: false)
                ], paymentStatus: .unpaid, lockedByPaymentID: nil)
            ]),
            Order(id: UUID(), sessionID: sessionID, participantID: guest.id, staffID: nil, status: .pendingApproval, createdAt: Date().addingTimeInterval(-420), note: "Tatlı ortaya", items: [
                OrderItem(id: UUID(), menuItemID: cake.id, name: cake.name, quantity: 1, unitPrice: cake.price, taxRate: 0.10, ownerShares: [OrderItemOwnerShare(id: UUID(), participantID: guest.id, amount: cake.price, isPaid: false)], paymentStatus: .unpaid, lockedByPaymentID: nil)
            ])
        ]

        return DemoData(
            business: Business(id: businessID, name: "Paylift Demo Bistro", taxLabel: "Gün Sonu Satış Özeti"),
            branch: Branch(id: branchID, businessID: businessID, name: "Nişantaşı Şube", address: "Teşvikiye Mah. Demo Sok. No: 12"),
            table: RestaurantTable(id: tableID, branchID: branchID, number: "12", capacity: 6, status: "Aktif"),
            session: TableSession(id: sessionID, tableID: tableID, secureToken: "qr_demo_5m_signed_token", startedAt: Date().addingTimeInterval(-2700), isOpen: true),
            participants: [emre, deniz, guest, waiter],
            categories: [main, shared, drinks, desserts],
            menuItems: [burger, pasta, meze, lemonade, coffee, cake],
            orders: orders
        )
    }
}
