import Testing
@testable import Paylift

@MainActor
struct PayliftTests {
    @Test func ownItemAllocationsOnlyIncludeActiveParticipantShares() {
        let store = PayliftDemoStore()

        let allocations = store.allocationsForOwnItems()
        let expected = store.unpaidBillItems.flatMap { item in
            item.ownerShares.filter { $0.participantID == store.activeParticipantID && !$0.isPaid }
        }

        #expect(allocations.count == expected.count)
        #expect(allocations.reduce(Money.zero) { $0 + $1.amount }.cents == expected.reduce(0) { $0 + $1.amount.cents })
    }

    @Test func splitItemEquallyPreservesTotal() {
        let store = PayliftDemoStore()
        let item = store.unpaidBillItems.first { $0.name.contains("San Sebastian") }!
        let participants = store.participants.filter { $0.role == .customer }.map(\.id)

        store.splitItemEqually(item, between: participants)

        let updatedItem = store.unpaidBillItems.first { $0.id == item.id }!
        #expect(updatedItem.ownerShares.count == participants.count)
        #expect(updatedItem.ownerShares.reduce(0) { $0 + $1.amount.cents } == item.total.cents)
    }

    @Test func payingSelectedItemsMarksThemPaid() async {
        let store = PayliftDemoStore()
        let selectedItem = store.unpaidBillItems[0]
        store.toggleBillSelection(selectedItem)

        await store.pay(mode: .selectedItems)

        let updatedItem = store.billItems.first { $0.id == selectedItem.id }!
        #expect(updatedItem.paymentStatus == .paid)
        #expect(store.payments.last?.status == .paid)
    }
}
