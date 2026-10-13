import Network
import SwiftUI

/// Publishes live connectivity state. Mirrors android/core/network/NetworkMonitor.kt.
final class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.stak.network-monitor", qos: .utility)

    @Published private(set) var isConnected: Bool = true

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let connected = path.status == .satisfied
            DispatchQueue.main.async { self?.isConnected = connected }
        }
        monitor.start(queue: queue)
    }
}
