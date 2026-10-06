import Foundation

/// URLSession-based HTTP client for the STAK backend.
/// Mirrors android/core/network/NetworkModule.kt:
///   - Base URL: stak-backend Cloud Run
///   - 15 s connect / 45 s resource timeout
///   - Adds Authorization: Bearer header from the live Supabase session (falls back to
///     Session.shared.token for the brief window between setToken and supabase-swift
///     refreshing its own cache)
///   - On 401: refreshes the Supabase session once, retries with the new token
actor NetworkModule {
    static let shared = NetworkModule()
    static let baseURL = "https://stak-backend-889057229494.us-central1.run.app/"

    private let urlSession: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 15
        cfg.timeoutIntervalForResource = 45
        urlSession = URLSession(configuration: cfg)
        decoder = JSONDecoder()
        encoder = JSONEncoder()
    }

    // MARK: – Public HTTP verbs

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        let req = try buildRequest(path, method: "GET", query: query)
        return try await perform(req)
    }

    func post<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        var req = try buildRequest(path, method: "POST")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(req)
    }

    func put<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        var req = try buildRequest(path, method: "PUT")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(req)
    }

    func patch<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        var req = try buildRequest(path, method: "PATCH")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(req)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        let req = try buildRequest(path, method: "DELETE")
        return try await perform(req)
    }

    /// Raw byte stream for server-sent events (STAK AI streaming, Phase 4).
    func postStream(_ path: String, body: some Encodable) async throws -> URLSession.AsyncBytes {
        var req = try buildRequest(path, method: "POST")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        let (stream, _) = try await urlSession.bytes(for: req)
        return stream
    }

    // MARK: – Internals

    private func buildRequest(_ path: String, method: String, query: [String: String] = [:]) throws -> URLRequest {
        var comps = URLComponents(string: Self.baseURL + path)!
        if !query.isEmpty {
            comps.queryItems = query.sorted(by: { $0.key < $1.key }).map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = comps.url else { throw NetworkError.badURL(path) }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        let token = currentToken()
        if !token.isEmpty { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return req
    }

    private func currentToken() -> String {
        // supabase-swift restores its Keychain session on init, so currentSession
        // is populated after the first auth event. Session.shared is @MainActor and
        // cannot be accessed synchronously from this actor — supabase's own store suffices.
        supabase.auth.currentSession?.accessToken ?? ""
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await urlSession.data(for: request)
        let http = response as! HTTPURLResponse

        if http.statusCode == 401 {
            try? await supabase.auth.refreshSession()
            var retried = request
            retried.setValue("Bearer \(currentToken())", forHTTPHeaderField: "Authorization")
            let (data2, res2) = try await urlSession.data(for: retried)
            let http2 = res2 as! HTTPURLResponse
            guard (200..<300).contains(http2.statusCode) else {
                throw NetworkError.http(http2.statusCode, String(data: data2, encoding: .utf8))
            }
            return try decoder.decode(T.self, from: data2)
        }

        guard (200..<300).contains(http.statusCode) else {
            throw NetworkError.http(http.statusCode, String(data: data, encoding: .utf8))
        }
        return try decoder.decode(T.self, from: data)
    }
}
