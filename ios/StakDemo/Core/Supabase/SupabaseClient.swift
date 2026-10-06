import Supabase

/// Shared Supabase client. URL and anon key come from Secrets.xcconfig → Info.plist.
/// Mirrors android/core/supabase/SupabaseModule.kt.
let supabase: SupabaseClient = {
    guard
        let urlString = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
        let url = URL(string: urlString),
        let key = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String
    else {
        fatalError("SupabaseURL / SupabaseAnonKey missing from Info.plist – fill in Secrets.xcconfig")
    }
    return SupabaseClient(supabaseURL: url, supabaseKey: key)
}()
