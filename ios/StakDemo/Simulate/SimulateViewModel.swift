import SwiftUI

/// Sandbox VM: loads the live paper portfolio on launch, then routes every
/// trade/setup action through the sandbox API before updating PaperPortfolio.
@MainActor
final class SimulateViewModel: ObservableObject {
    private let repo = StockRepository.shared
    private var loaded = false

    func load() async {
        guard !loaded else { return }
        loaded = true
        guard !PaperPortfolio.shared.demo else { return }
        do {
            async let portfolioFetch = repo.getSandboxPortfolio()
            async let tradesFetch = repo.getSandboxTrades()
            let (portfolio, trades) = try await (portfolioFetch, tradesFetch)
            if !portfolio.initialized {
                PaperPortfolio.shared.reset(demo: false)
            } else {
                PaperPortfolio.shared.syncFromServer(portfolio: portfolio, trades: trades.trades)
            }
        } catch {}
    }

    func refresh() async {
        loaded = false
        await load()
    }

    func executeTrade(spec: BuySpec, amount: Double, limitPrice: Double?) async -> Bool {
        if PaperPortfolio.shared.demo {
            return localTrade(spec: spec, amount: amount, limitPrice: limitPrice)
        }
        guard PaperPortfolio.shared.canBuy(amount) else { return false }
        do {
            if let limit = limitPrice {
                _ = try await repo.sandboxPlaceOrder(ticker: spec.symbol, amount: amount, limitPrice: limit)
                return PaperPortfolio.shared.placeLimit(spec, amount: amount, limit: limit)
            } else {
                _ = try await repo.sandboxBuy(ticker: spec.symbol, amount: amount)
                PaperPortfolio.shared.buy(spec, amount: amount)
                return true
            }
        } catch {
            return false
        }
    }

    func executeSell(symbol: String, portion: Double) async -> Bool {
        if PaperPortfolio.shared.demo {
            return PaperPortfolio.shared.sell(symbol, portion: portion)
        }
        do {
            _ = try await repo.sandboxSell(ticker: symbol, portion: portion)
            return PaperPortfolio.shared.sell(symbol, portion: portion)
        } catch {
            return false
        }
    }

    func executeSetup(balance: Double, name: String, strategy: String) async {
        if PaperPortfolio.shared.demo {
            PaperPortfolio.shared.setup(balance: balance, name: name, strategy: strategy)
            return
        }
        do { _ = try await repo.sandboxSetup(startingBalance: balance, name: name, strategy: strategy) } catch {}
        PaperPortfolio.shared.setup(balance: balance, name: name, strategy: strategy)
    }

    private func localTrade(spec: BuySpec, amount: Double, limitPrice: Double?) -> Bool {
        guard PaperPortfolio.shared.canBuy(amount) else { return false }
        if let limit = limitPrice { return PaperPortfolio.shared.placeLimit(spec, amount: amount, limit: limit) }
        PaperPortfolio.shared.buy(spec, amount: amount)
        return true
    }
}
