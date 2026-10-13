import Foundation

/// Mirrors android/data/HttpErrors.kt — the server's JSON reason for a failed HTTP call,
/// or nil when it was not an HTTP error or carried no body.
enum NetworkError: Error, LocalizedError {
    case badURL(String)
    case http(Int, String?)

    var errorDescription: String? {
        switch self {
        case .badURL(let path): return "Invalid URL: \(path)"
        case .http(let code, let body): return "HTTP \(code)\(body.map { ": \($0)" } ?? "")"
        }
    }
}

func httpErrorBody(_ error: Error) -> String? {
    guard case .http(_, let body) = error as? NetworkError else { return nil }
    return body
}
