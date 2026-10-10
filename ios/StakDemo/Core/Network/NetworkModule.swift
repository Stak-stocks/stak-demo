import Foundation
import Supabase

/// URLSession-based HTTP client for the STAK backend.
/// Mirrors android/core/network/NetworkModule.kt:
///   - Base URL: stak-backend Cloud Run
///   - 45 s between bytes (android's read timeout - cold Gemini-backed routes like the daily brief take longer than
///     15 s), 5 min overall so a long STAK AI answer can finish streaming
///   - Adds Authorization: Bearer from the Supabase session (refreshed first when expired), falling back to
///     Session.shared.token in the brief window before supabase-swift has its own
///   - On 401: refreshes the Supabase session once and retries only with a token that actually changed, then hands it
///     to Session (android's authenticator)
actor NetworkModule {
    static let shared = NetworkModule()
    static let baseURL = "https://stak-backend-889057229494.us-central1.run.app/"

    private let urlSession: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 45
        cfg.timeoutIntervalForResource = 300
        urlSession = URLSession(configuration: cfg)
        decoder = JSONDecoder()
        encoder = JSONEncoder()
    }

    // MARK: – Public HTTP verbs

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        let req = try await buildRequest(path, method: "GET", query: query)
        return try await perform(req)
    }

    func post<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        var req = try await buildRequest(path, method: "POST")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(req)
    }

    func put<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        var req = try await buildRequest(path, method: "PUT")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(req)
    }

    func patch<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        var req = try await buildRequest(path, method: "PATCH")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(req)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        let req = try await buildRequest(path, method: "DELETE")
        return try await perform(req)
    }

    /// Raw byte stream for server-sent events (STAK AI streaming, Phase 4). The server refuses some questions before
    /// any event - 429 limit_reached, 404 not_found (a chat deleted elsewhere), 401 - as a plain JSON reply: those
    /// throw StakAiStreamError with its code (and usage), as android's repository does, instead of reading as a stream
    /// that never said anything. A 401 refreshes the session and tries once more.
    func postStream(_ path: String, body: some Encodable) async throws -> URLSession.AsyncBytes {
        var req = try await buildRequest(path, method: "POST")
        req.httpBody = try encoder.encode(body)
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        var (stream, response) = try await urlSession.bytes(for: req)
        if (response as? HTTPURLResponse)?.statusCode == 401, let fresh = await refreshedToken(replacing: req) {
            req.setValue("Bearer \(fresh)", forHTTPHeaderField: "Authorization")
            (stream, response) = try await urlSession.bytes(for: req)
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 200
        guard (200..<300).contains(status) else {
            var data = Data()
            for try await byte in stream { data.append(byte) }
            let err = try? decoder.decode(StakAiError.self, from: data)
            throw StakAiStreamError(err?.code ?? (status == 401 ? "unauthorized" : "ai_unavailable"), usage: err?.usage)
        }
        return stream
    }

    // MARK: – Internals

    private func buildRequest(_ path: String, method: String, query: [String: String] = [:]) async throws -> URLRequest {
        var comps = URLComponents(string: Self.baseURL + path)!
        if !query.isEmpty {
            comps.queryItems = query.sorted(by: { $0.key < $1.key }).map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = comps.url else { throw NetworkError.badURL(path) }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        let token = await currentToken()
        if !token.isEmpty { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return req
    }

    /// The Supabase session's token - `session` refreshes it first when it has expired (a phone back from the
    /// background), saving a 401 round trip - else the one Session keeps from sign-in.
    private func currentToken() async -> String {
        if let token = try? await supabase.auth.session.accessToken, !token.isEmpty { return token }
        return await MainActor.run { Session.shared.token } ?? ""
    }

    /// A fresh token after a 401 - nil when the refresh failed or gave back the token that was just refused (retrying
    /// with it can only fail again). Session keeps the new one, as android's authenticator does.
    private func refreshedToken(replacing request: URLRequest) async -> String? {
        let sent = request.value(forHTTPHeaderField: "Authorization")?.replacingOccurrences(of: "Bearer ", with: "") ?? ""
        // A token another request already refreshed is used as is; otherwise one refresh - a dead session (offline, a
        // revoked refresh token) was being refreshed twice per request.
        let current = (try? await supabase.auth.session.accessToken) ?? ""
        let fresh: String
        if !current.isEmpty, current != sent {
            fresh = current
        } else {
            do {
                let refreshed = try await supabase.auth.refreshSession().accessToken
                guard !refreshed.isEmpty, refreshed != sent else { return nil }
                fresh = refreshed
            } catch {
                // No saved session, or Supabase saying the session is gone: the sign-in was ended somewhere else and no
                // retry can bring it back - the app goes to Sign in (as android's authenticator). A network failure or
                // an auth outage is only a bad moment, and changes nothing.
                if Self.isDeadSession(error) { await MainActor.run { Session.shared.reportEndedElsewhere() } }
                return nil
            }
        }
        await MainActor.run { Session.shared.setToken(fresh) }
        return fresh
    }

    /// Supabase's answers that mean the session is over for good - the same list as android NetworkModule.
    private static let deadSessionCodes: Set<String> = [
        "refresh_token_not_found", "refresh_token_already_used", "session_not_found", "session_expired",
        "user_not_found", "user_banned",
    ]

    private static func isDeadSession(_ error: Error) -> Bool {
        guard let auth = error as? AuthError else { return false }
        if case .sessionMissing = auth { return true }
        return deadSessionCodes.contains(auth.errorCode.rawValue)
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        var (data, response) = try await urlSession.data(for: request)
        if (response as? HTTPURLResponse)?.statusCode == 401, let fresh = await refreshedToken(replacing: request) {
            var retried = request
            retried.setValue("Bearer \(fresh)", forHTTPHeaderField: "Authorization")
            (data, response) = try await urlSession.data(for: retried)
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw NetworkError.http(status, String(data: data, encoding: .utf8))
        }
        return try decoder.decode(T.self, from: data)
    }
}
