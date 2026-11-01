import Foundation
import Supabase

/// The project's address and public key, from Secrets.xcconfig → Info.plist - the client below and the requests made
/// beside it (AccountLinking) read them here.
enum SupabaseConfig {
    static let url: URL = {
        // xcconfig treats `//` as a comment, so SUPABASE_URL stores just the host
        // (e.g. "ggqbtdttlmshfdlrgdji.supabase.co") and we prepend https:// here.
        guard
            let host = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
            !host.isEmpty,
            let url = URL(string: "https://\(host)"),
            url.host != nil
        else {
            fatalError("SupabaseURL missing from Info.plist – fill in Secrets.xcconfig")
        }
        return url
    }()

    static let anonKey: String = {
        guard let key = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String, !key.isEmpty else {
            fatalError("SupabaseAnonKey missing from Info.plist – fill in Secrets.xcconfig")
        }
        return key
    }()
}

/// Shared Supabase client. Mirrors android/core/supabase/SupabaseModule.kt.
let supabase: SupabaseClient = {
    // The app reads `auth.session` (which refreshes itself) and doesn't listen for the initial session, so it takes the
    // library's coming default now: the stored session is emitted as-is. This also silences its startup warning.
    SupabaseClient(
        supabaseURL: SupabaseConfig.url,
        supabaseKey: SupabaseConfig.anonKey,
        options: SupabaseClientOptions(auth: .init(emitLocalSessionAsInitialSession: true))
    )
}()
