import Foundation
import Supabase

/// Shared Supabase client. URL and anon key come from Secrets.xcconfig → Info.plist.
/// Mirrors android/core/supabase/SupabaseModule.kt.
let supabase: SupabaseClient = {
    // xcconfig treats `//` as a comment, so SUPABASE_URL stores just the host
    // (e.g. "ggqbtdttlmshfdlrgdji.supabase.co") and we prepend https:// here.
    guard
        let host = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
        !host.isEmpty,
        let url = URL(string: "https://\(host)"),
        url.host != nil,
        let key = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String,
        !key.isEmpty
    else {
        fatalError("SupabaseURL / SupabaseAnonKey missing from Info.plist – fill in Secrets.xcconfig")
    }
    return SupabaseClient(supabaseURL: url, supabaseKey: key)
}()
