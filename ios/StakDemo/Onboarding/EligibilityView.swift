import SwiftUI

/// "Before we get started": the beta's 18+ / U.S. confirmation and the Terms / Privacy acceptance (Terms §2). While an
/// account hasn't confirmed, `required` is true and the gate covers the whole app - a new account right after it signs
/// up, an existing one the next time it opens. The age is worked out by the server, which keeps only that it was
/// confirmed; under 18 it deletes the account, and this phone can't try another date for 30 days. Mirrors
/// shared/src/eligibility.ts, web components/onboarding/EligibilityGate.tsx and android data/Eligibility.kt.
@MainActor
final class EligibilityGate: ObservableObject {
	static let shared = EligibilityGate()
	static let termsURL = URL(string: "https://thestak.org/terms")!
	static let privacyURL = URL(string: "https://thestak.org/privacy")!
	private static let blockedKey = "eligibility.blockedUntil"
	private static let blockSeconds: TimeInterval = 30 * 24 * 60 * 60

	/// The signed-in account hasn't confirmed: the gate is up.
	@Published private(set) var required = false

	private init() {}

	/// This phone was refused (under 18) in the last 30 days: the gate shows only the answer, no form. Kept in the
	/// phone's own defaults - not StakStore, whose keys are per account (and a refused account is gone).
	var blockedHere: Bool { UserDefaults.standard.double(forKey: Self.blockedKey) > Date().timeIntervalSince1970 }

	/// From an account read (ProfileSync): the server says whether this account still has to confirm.
	func apply(_ me: MeResponse) {
		guard !StakStore.demoAccount else { return }
		if required != me.needsEligibility { required = me.needsEligibility }
	}

	/// Asks the server now - right after a sign-in or sign-up, and when the app opens.
	func check() {
		guard !StakStore.demoAccount, Session.shared.token != nil else { return }
		let account = Session.shared.accountGeneration
		Task {
			guard let me = try? await StockRepository.shared.getMe(), Session.shared.accountGeneration == account else { return }
			apply(me)
		}
	}

	enum Outcome: Equatable {
		case confirmed
		/// Not eligible: the server has deleted the account.
		case refused
		/// `invalid`: the server didn't accept the date or a box; otherwise a network or server failure.
		case failed(invalid: Bool)
	}

	/// Sends the confirmation. `dob` is "YYYY-MM-DD".
	func confirm(dob: String) async -> Outcome {
		do {
			_ = try await StockRepository.shared.confirmEligibility(dob: dob)
			required = false
			return .confirmed
		} catch NetworkError.http(let code, _) {
			switch code {
			case 403:
				UserDefaults.standard.set(Date().timeIntervalSince1970 + Self.blockSeconds, forKey: Self.blockedKey)
				return .refused
			case 400: return .failed(invalid: true)
			default: return .failed(invalid: false)
			}
		} catch {
			return .failed(invalid: false)
		}
	}

	/// Signed out: nothing to ask until the next account says so.
	func reset() { required = false }

	/// "MMDDYYYY" as typed -> "YYYY-MM-DD", or nil until it's a whole, real date (the server checks it again).
	nonisolated static func isoDob(_ digits: String) -> String? {
		guard digits.count == 8, let mm = Int(digits.prefix(2)), let dd = Int(digits.dropFirst(2).prefix(2)), let yyyy = Int(digits.suffix(4)) else { return nil }
		var cal = Calendar(identifier: .gregorian)
		cal.timeZone = TimeZone(identifier: "UTC")!
		guard let date = cal.date(from: DateComponents(year: yyyy, month: mm, day: dd)) else { return nil }
		let back = cal.dateComponents([.year, .month, .day], from: date)
		guard back.year == yyyy, back.month == mm, back.day == dd else { return nil }
		return String(format: "%04d-%02d-%02d", yyyy, mm, dd)
	}

	/// Up to eight typed digits as MM/DD/YYYY.
	nonisolated static func formatDob(_ digits: String) -> String {
		let d = Array(digits.prefix(8))
		if d.count > 4 { return String(d[0..<2]) + "/" + String(d[2..<4]) + "/" + String(d[4...]) }
		if d.count > 2 { return String(d[0..<2]) + "/" + String(d[2...]) }
		return String(d)
	}
}

/// The gate's screen: date of birth, U.S. residence and the Terms / Privacy. The wording doesn't name the cutoff until
/// someone's under it. `onRefused`: the server has deleted the account - sign out and start over.
struct EligibilityView: View {
	let onRefused: () -> Void
	@State private var digits = ""
	@State private var inUS = false
	@State private var accepted = false
	@State private var busy = false
	@State private var error: String? = nil
	@State private var refused = EligibilityGate.shared.blockedHere

	private var dob: String? { EligibilityGate.isoDob(digits) }
	private var dobError: String? { digits.count == 8 && dob == nil ? "Enter a real date" : nil }
	private var ready: Bool { dob != nil && inUS && accepted && !busy }

	var body: some View {
		let u = figmaUnit
		ZStack {
			AuthWatermark()
			Artboard {
				ScrollView {
					VStack(alignment: .leading, spacing: 14 * u) {
						if refused {
							title("We can’t open STAK for you yet", u: u)
							subtitle("STAK is currently available only to users 18 and older.", u: u)
						} else {
							VStack(alignment: .leading, spacing: 12 * u) {
								title("Before we get started", u: u)
								subtitle("A couple of quick details first.", u: u)
							}
							Spacer().frame(height: 4 * u)
							Text("Date of birth")
								.font(StakFont.geist(12 * u, .medium))
								.foregroundStyle(StakColors.muted)
							AuthInput("MM/DD/YYYY", text: Binding(
								get: { EligibilityGate.formatDob(digits) },
								set: { digits = String($0.filter(\.isNumber).prefix(8)); error = nil }
							), keyboard: .numberPad, contentType: .dateTime)
							.error(dobError)
							check(inUS, "I confirm that I currently live in the United States.", u: u) { inUS.toggle() }
							check(accepted, "I agree to the [Terms of Service](\(EligibilityGate.termsURL.absoluteString)) and [Privacy Policy](\(EligibilityGate.privacyURL.absoluteString)).", u: u) { accepted.toggle() }
						}
					}
					.frame(maxWidth: .infinity, alignment: .topLeading)
					.padding(.horizontal, 24 * u)
					.padding(.top, 32 * u)
				}
				.scrollDismissesKeyboard(.interactively)

				VStack(spacing: 12 * u) {
					if let error {
						Text(error)
							.font(StakFont.geist(11 * u))
							.foregroundStyle(Auth.errorRed)
							.frame(maxWidth: .infinity, alignment: .leading)
							.padding(.horizontal, 24 * u)
					}
					if refused {
						AuthCta(text: "OK", action: onRefused)
					} else {
						AuthCta(text: busy ? "Checking…" : "Continue", enabled: ready) { submit() }
					}
				}
				.padding(.top, 8 * u)
				.padding(.bottom, 26 * u)
			}
		}
		.background(StakColors.bg.ignoresSafeArea())
		// The gate is the whole screen: VoiceOver can't wander into the app beneath it.
		.accessibilityAddTraits(.isModal)
	}

	private func submit() {
		guard ready, let dob else { return }
		busy = true
		error = nil
		Task {
			switch await EligibilityGate.shared.confirm(dob: dob) {
			case .confirmed: break
			case .refused: refused = true
			case .failed(let invalid): error = invalid ? "Check your date of birth and both boxes." : "Something went wrong. Try again."
			}
			busy = false
		}
	}

	private func title(_ text: String, u: CGFloat) -> some View {
		Text(text)
			.font(StakFont.sora(26 * u, .semiBold))
			.stakLineHeight(33 * u, size: 26 * u, face: .sora)
			.foregroundStyle(StakColors.textPrimary)
			.accessibilityAddTraits(.isHeader)
	}

	private func subtitle(_ text: String, u: CGFloat) -> some View {
		Text(text)
			.font(StakFont.geist(12 * u))
			.stakLineHeight(16 * u, size: 12 * u, face: .geist)
			.foregroundStyle(Auth.subtitleGray)
	}

	/// A checkbox row. The label is Markdown, so its links open in the browser; tapping elsewhere on the row toggles.
	private func check(_ checked: Bool, _ label: String, u: CGFloat, toggle: @escaping () -> Void) -> some View {
		HStack(alignment: .top, spacing: 10 * u) {
			Button(action: toggle) {
				ZStack {
					RoundedRectangle(cornerRadius: 5 * u)
						.fill(checked ? StakColors.teal : Color.clear)
					if !checked {
						RoundedRectangle(cornerRadius: 5 * u).strokeBorder(StakColors.muted, lineWidth: 1.5 * u)
					} else {
						Image(systemName: "checkmark")
							.font(.system(size: 11 * u, weight: .bold))
							.foregroundStyle(StakColors.bg)
					}
				}
				.frame(width: 20 * u, height: 20 * u)
				.padding(.top, 1 * u)
			}
			.buttonStyle(.pressDim)
			.accessibilityLabel(Text(.init(label)))
			.accessibilityValue(checked ? "Checked" : "Not checked")
			.accessibilityAddTraits(.isToggle)
			Text(.init(label))
				.font(StakFont.geist(13 * u))
				.foregroundStyle(StakColors.textPrimary)
				.tint(StakColors.teal)
				.frame(maxWidth: .infinity, alignment: .leading)
				.contentShape(Rectangle())
				.onTapGesture(perform: toggle)
		}
	}
}
