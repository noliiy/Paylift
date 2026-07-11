import Foundation

enum APIConfig {
    #if DEBUG
    static let baseURL = URL(string: "http://localhost:3000/api/v1")!
    #else
    static let baseURL = URL(string: "https://api.paylift.app/api/v1")!
    #endif
}

struct AuthTokenResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: String
    let userId: String?
}

struct OAuthSignInRequest: Codable {
    let displayName: String
    let email: String?
    let identityToken: String?
}

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case server(Int, String)
    case decoding(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: "Invalid request URL."
        case .unauthorized: "Session expired. Please sign in again."
        case .server(let code, let message): "Server error (\(code)): \(message)"
        case .decoding(let error): "Failed to parse response: \(error.localizedDescription)"
        }
    }
}

final class APIClient {
    static let shared = APIClient()

    private(set) var accessToken: String?
    private let session: URLSession
    private let decoder: JSONDecoder

    init(session: URLSession = .shared) {
        self.session = session
        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
    }

    func setAccessToken(_ token: String?) {
        accessToken = token
    }

    func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        authorized: Bool = false
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: APIConfig.baseURL) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if authorized, let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.server(0, "No HTTP response")
        }

        guard (200...299).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            if http.statusCode == 401 { throw APIError.unauthorized }
            throw APIError.server(http.statusCode, message)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}

private struct AnyEncodable: Encodable {
    private let encodeFunc: (Encoder) throws -> Void

    init(_ value: any Encodable) {
        encodeFunc = value.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeFunc(encoder)
    }
}
