import Foundation

enum AuthProvider: String, Codable {
    case apple
    case google
    case guest
}

@MainActor
final class AuthService {
    static let shared = AuthService()

    private let client = APIClient.shared
    private(set) var currentUserId: String?
    private(set) var provider: AuthProvider?

    var isSignedIn: Bool { client.accessToken != nil }

    func signInWithApple(displayName: String, identityToken: String?, email: String? = nil) async throws {
        try await signIn(path: "auth/sign-in-with-apple", displayName: displayName, identityToken: identityToken, email: email, provider: .apple)
    }

    func signInWithGoogle(displayName: String, identityToken: String?, email: String? = nil) async throws {
        try await signIn(path: "auth/sign-in-with-google", displayName: displayName, identityToken: identityToken, email: email, provider: .google)
    }

    func signOut() {
        client.setAccessToken(nil)
        currentUserId = nil
        provider = nil
    }

    private func signIn(path: String, displayName: String, identityToken: String?, email: String?, provider: AuthProvider) async throws {
        let body = OAuthSignInRequest(displayName: displayName, email: email, identityToken: identityToken)
        let response: AuthTokenResponse = try await client.request(path, method: "POST", body: body)
        client.setAccessToken(response.accessToken)
        currentUserId = response.userId
        self.provider = provider
    }
}

struct QRResolveResponse: Codable {
    let businessId: String
    let branchId: String
    let tableId: String
    let tableSession: TableSessionDTO?
    let createSessionHint: CreateSessionHint?
}

struct CreateSessionHint: Codable {
    let tableId: String
    let branchId: String
}

struct TableSessionDTO: Codable {
    let id: String
    let status: String
}

struct JoinSessionRequest: Codable {
    let displayName: String
    let seatLabel: String?
}

struct JoinSessionResponse: Codable {
    let id: String
    let displayName: String
}

struct CreateOrderRequest: Codable {
    let note: String?
    let items: [CreateOrderItemRequest]
}

struct CreateOrderItemRequest: Codable {
    let menuItemId: String
    let quantity: Int
    let note: String?
}

struct OrderDTO: Codable {
    let id: String
    let status: String
    let items: [OrderItemDTO]
}

struct OrderItemDTO: Codable {
    let id: String
    let nameSnapshot: String
    let quantity: Int
    let unitPriceCents: Int
    let paymentStatus: String
}

struct BillResponse: Codable {
    let sessionId: String
    let subtotalCents: Int
    let taxCents: Int
    let totalCents: Int
}

@MainActor
final class TableSessionAPI {
    static let shared = TableSessionAPI()
    private let client = APIClient.shared

    func resolveQR(token: String) async throws -> QRResolveResponse {
        struct Body: Codable { let token: String }
        return try await client.request("qr/resolve", method: "POST", body: Body(token: token))
    }

    func joinSession(sessionId: String, displayName: String) async throws -> JoinSessionResponse {
        let body = JoinSessionRequest(displayName: displayName, seatLabel: nil)
        return try await client.request("table-sessions/\(sessionId)/join", method: "POST", body: body, authorized: true)
    }
}

@MainActor
final class OrdersAPI {
    static let shared = OrdersAPI()
    private let client = APIClient.shared

    func createOrder(sessionId: String, items: [CreateOrderItemRequest], note: String? = nil) async throws -> OrderDTO {
        let body = CreateOrderRequest(note: note, items: items)
        return try await client.request("table-sessions/\(sessionId)/orders", method: "POST", body: body, authorized: true)
    }

    func listOrders(sessionId: String) async throws -> [OrderDTO] {
        try await client.request("table-sessions/\(sessionId)/orders", authorized: true)
    }
}

@MainActor
final class BillAPI {
    static let shared = BillAPI()
    private let client = APIClient.shared

    func getBill(sessionId: String) async throws -> BillResponse {
        try await client.request("table-sessions/\(sessionId)/bill", authorized: true)
    }

    func splitItemEqually(sessionId: String, orderItemId: String, participantIds: [String]) async throws {
        struct Body: Codable {
            let orderItemId: String
            let participantIds: [String]
        }
        struct Share: Codable { let id: String }
        let _: [Share] = try await client.request(
            "table-sessions/\(sessionId)/bill/split-item",
            method: "POST",
            body: Body(orderItemId: orderItemId, participantIds: participantIds),
            authorized: true
        )
    }
}
