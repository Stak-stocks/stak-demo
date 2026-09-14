import SwiftUI

/// The Go live steps (FigJam "STAK · Go live to buy and sell": Tap Go live -> intro ->
/// KYC x4 -> Under review -> Verified? -> Link -> Add funds -> Processing -> Cash
/// available -> Real money ON).
private enum GoLiveStep: String {
	case intro, name, address, ssn, agree, review, result, bank, funds, processing, ready, on
}

private let employmentOptions = ["Employed", "Self-employed", "Student", "Retired", "Not working"]

/// Go live (FigJam Full Cascade copies, 2026-09-14). One page that walks the board's
/// steps in order and resumes where the account left off: an account under review
/// lands on Under review, a verified one on Link / Add funds. The demo verifier
/// rejects applicants under 18 (the board's Rejected -> Fix & resubmit -> re-enter
/// details edge). Mirrors android ui/live/GoLiveFlow.kt.
struct GoLiveFlow: View {
	let onBack: () -> Void
	let onOpenAccount: () -> Void
	@ObservedObject private var account = LiveAccount.shared

	@State private var step: GoLiveStep
	// The KYC form - prefilled from a rejected application so Fix & resubmit re-enters the details.
	@State private var first: String
	@State private var last: String
	@State private var dob: String
	@State private var street: String
	@State private var city: String
	@State private var state: String
	@State private var zip: String
	@State private var employment: String
	@State private var ssn = ""
	@State private var showSsn = false
	@State private var attempted = false
	@State private var agreeCustomer = false
	@State private var agreeRisk = false
	@State private var agreePrivacy = false
	@State private var bank = -1
	@State private var fundAmount = 100.0
	@State private var fundCustom = false
	@State private var fundText = ""
	@State private var depositId = ""

	init(onBack: @escaping () -> Void, onOpenAccount: @escaping () -> Void) {
		self.onBack = onBack
		self.onOpenAccount = onOpenAccount
		let a = LiveAccount.shared
		let start: GoLiveStep
		switch a.status {
		case .review: start = .review
		case .rejected: start = .result
		case .verified: start = !a.bankLinked ? .bank : (a.cash > 0 ? .ready : .funds)
		case .live: start = .on
		case .none: start = .intro
		}
		_step = State(initialValue: start)
		_first = State(initialValue: a.kyc.firstName)
		_last = State(initialValue: a.kyc.lastName)
		_dob = State(initialValue: a.kyc.dob)
		_street = State(initialValue: a.kyc.street)
		_city = State(initialValue: a.kyc.city)
		_state = State(initialValue: a.kyc.state)
		_zip = State(initialValue: a.kyc.zip)
		_employment = State(initialValue: a.kyc.employment)
	}

	private var dobError: String? {
		if dob.trimmingCharacters(in: .whitespaces).isEmpty { return "Enter your date of birth" }
		if LiveAccount.ageOf(dob) == nil { return "Use the form YYYY-MM-DD" }
		return nil
	}

	private func back() {
		attempted = false
		switch step {
		case .name: step = .intro
		case .address: step = .name
		case .ssn: step = .address
		case .agree: step = .ssn
		case .funds: if depositId.isEmpty { step = .bank } else { onBack() }
		// Leaving mid-processing lands the deposit now (review 2026-09-14): the 2 s is cosmetic.
		case .processing: account.settle(depositId); onBack()
		default: onBack()
		}
	}

	private var title: String {
		switch step {
		case .intro: return "Go live"
		case .name, .address, .ssn, .agree, .review, .result: return "Identity check"
		case .bank, .funds, .processing, .ready: return "Fund account"
		case .on: return "Real money"
		}
	}

	var body: some View {
		LivePage(title: title, onBack: back) {
			Group {
				switch step {
				case .intro: intro
				case .name: nameStep
				case .address: addressStep
				case .ssn: ssnStep
				case .agree: agreeStep
				case .review: reviewStep
				case .result: resultStep
				case .bank: bankStep
				case .funds: fundsStep
				case .processing: processingStep
				case .ready: readyStep
				case .on: onStep
				}
			}
		}
	}

	// MARK: - Steps

	private var intro: some View {
		let u = figmaUnit
		return Group {
			LiveCard {
				LiveKicker(text: "WHAT CHANGES")
				LiveTitle(text: "Trade with real money")
				LiveBody(text: "Your saves, deck and lessons stay the same. Buys and sells on a live account move real cash through STAK’s brokerage partner.")
			}
			LiveCard {
				ChangeRow(title: "Real cash", body: "You fund the account from a bank or card and can withdraw any time.")
				ChangeRow(title: "Same picks", body: "Stock Detail’s Buy becomes a live order ticket. Practice trading stays in Simulate.")
				ChangeRow(title: "Identity first", body: "A short identity check is required by law before any money moves.")
			}
			Spacer().frame(height: 4 * u)
			AuthCta(text: "Start", action: { step = .name })
			LiveSecondary(text: "Not now", action: onBack)
		}
	}

	private var nameStep: some View {
		Group {
			StepHeader(kicker: "STEP 1 OF 4", title: "Your name and date of birth", body: "Exactly as they appear on your ID.")
			AuthInput("First name", text: $first)
				.error(attempted && first.trimmingCharacters(in: .whitespaces).isEmpty ? "Enter your first name" : nil)
			AuthInput("Last name", text: $last)
				.error(attempted && last.trimmingCharacters(in: .whitespaces).isEmpty ? "Enter your last name" : nil)
			AuthInput("Date of birth (YYYY-MM-DD)", text: $dob, keyboard: .numbersAndPunctuation)
				.error(attempted ? dobError : nil)
				.onChange(of: dob) { _, next in
					let clean = String(next.filter { $0.isNumber || $0 == "-" }.prefix(10))
					if clean != next { dob = clean }
				}
			AuthCta(text: "Continue", enabled: !first.trimmingCharacters(in: .whitespaces).isEmpty && !last.trimmingCharacters(in: .whitespaces).isEmpty && !dob.isEmpty, action: {
				attempted = true
				if !first.trimmingCharacters(in: .whitespaces).isEmpty, !last.trimmingCharacters(in: .whitespaces).isEmpty, dobError == nil { attempted = false; step = .address }
			})
		}
	}

	private var addressStep: some View {
		let u = figmaUnit
		return Group {
			StepHeader(kicker: "STEP 2 OF 4", title: "Where you live", body: "Your statements and tax forms go here.")
			AuthInput("Street address", text: $street)
				.error(attempted && street.trimmingCharacters(in: .whitespaces).isEmpty ? "Enter your street address" : nil)
			AuthInput("City", text: $city)
				.error(attempted && city.trimmingCharacters(in: .whitespaces).isEmpty ? "Enter your city" : nil)
			HStack(alignment: .top, spacing: 10 * u) {
				AuthInput("State", text: $state)
					.error(attempted && state.count != 2 ? "2 letters" : nil)
					.onChange(of: state) { _, next in
						let clean = String(next.prefix(2)).uppercased()
						if clean != next { state = clean }
					}
				AuthInput("ZIP", text: $zip, keyboard: .numberPad)
					.error(attempted && zip.count != 5 ? "5 digits" : nil)
					.onChange(of: zip) { _, next in
						let clean = String(next.filter(\.isNumber).prefix(5))
						if clean != next { zip = clean }
					}
			}
			AuthCta(text: "Continue", enabled: !street.isEmpty && !city.isEmpty && !state.isEmpty && !zip.isEmpty, action: {
				attempted = true
				if !street.trimmingCharacters(in: .whitespaces).isEmpty, !city.trimmingCharacters(in: .whitespaces).isEmpty, state.count == 2, zip.count == 5 { attempted = false; step = .ssn }
			})
		}
	}

	private var ssnStep: some View {
		let u = figmaUnit
		return Group {
			StepHeader(kicker: "STEP 3 OF 4", title: "Social Security number and work", body: "Required to open a brokerage account. Your SSN is sent for verification and never stored on this phone.")
			AuthInput("SSN (9 digits)", text: $ssn, keyboard: .numberPad, hidden: !showSsn) {
				ShowHideToggle(shown: $showSsn)
			}
			.error(attempted && !LiveAccount.ssnValid(ssn) ? "Enter all 9 digits" : nil)
			.onChange(of: ssn) { _, next in
				let clean = String(next.filter(\.isNumber).prefix(9))
				if clean != next { ssn = clean }
			}
			Text("Employment")
				.font(StakFont.geist(13 * u, .medium))
				.foregroundStyle(StakColors.textPrimary)
				.padding(.top, 4 * u)
			FlowLayout(spacing: 8 * u) {
				ForEach(employmentOptions, id: \.self) { e in
					SettingsChip(label: e, selected: employment == e) { employment = e }
				}
			}
			if attempted && employment.isEmpty {
				LiveBody(text: "Choose your employment status", color: Live.red)
			}
			AuthCta(text: "Continue", enabled: !ssn.isEmpty && !employment.isEmpty, action: {
				attempted = true
				if LiveAccount.ssnValid(ssn), !employment.isEmpty { attempted = false; step = .agree }
			})
		}
	}

	private var agreeStep: some View {
		Group {
			StepHeader(kicker: "STEP 4 OF 4", title: "Agreements", body: "Read and accept these to open the account.")
			PermissionCard(title: "Customer agreement", description: "The terms of your brokerage account with STAK’s partner.", isOn: $agreeCustomer)
			PermissionCard(title: "Risk disclosure", description: "Stocks can lose value. You can lose money you invest.", isOn: $agreeRisk)
			PermissionCard(title: "Privacy notice", description: "How your identity details are used and protected.", isOn: $agreePrivacy)
			AuthCta(text: "Submit for review", enabled: agreeCustomer && agreeRisk && agreePrivacy, action: {
				let profile = KycProfile(
					firstName: first.trimmingCharacters(in: .whitespaces), lastName: last.trimmingCharacters(in: .whitespaces), dob: dob.trimmingCharacters(in: .whitespaces),
					street: street.trimmingCharacters(in: .whitespaces), city: city.trimmingCharacters(in: .whitespaces), state: state.trimmingCharacters(in: .whitespaces), zip: zip.trimmingCharacters(in: .whitespaces),
					employment: employment
				)
				let ok = account.submit(profile, ssn: ssn)
				ssn = ""
				if ok { step = .review }
			})
		}
	}

	private var reviewStep: some View {
		Group {
			LiveCard {
				LiveKicker(text: "UNDER REVIEW", color: Live.amber)
				LiveTitle(text: "Checking your details")
				LiveBody(text: "We’re verifying \(account.kyc.fullName.isEmpty ? "your identity" : account.kyc.fullName) with our partner. This usually takes a moment; we’ll let you know either way.")
			}
			LiveCaption(text: "You can leave this page. The result shows on your Profile.")
		}
		// The demo verifier answers after a moment (FigJam: Under review -> Verified?).
		.afterDelay(step, millis: 2200) { account.resolveReview(); step = .result }
	}

	private var resultStep: some View {
		Group {
			if account.status == .rejected {
				LiveCard {
					LiveKicker(text: "NOT VERIFIED", color: Live.red)
					LiveTitle(text: "We couldn’t verify you")
					LiveBody(text: account.rejectionReason)
				}
				AuthCta(text: "Fix & resubmit", action: { attempted = false; agreeCustomer = false; agreeRisk = false; agreePrivacy = false; step = .name })
				LiveSecondary(text: "Back", action: onBack)
			} else {
				LiveCard {
					LiveKicker(text: "VERIFIED", color: Live.green)
					LiveTitle(text: "You’re verified")
					LiveBody(text: "Your identity checked out. Link a bank or card to fund the account.")
				}
				AuthCta(text: "Link a bank", action: { step = .bank })
			}
		}
	}

	private var bankStep: some View {
		let u = figmaUnit
		return Group {
			StepHeader(kicker: "FUNDING", title: "Link a card or bank", body: "Where deposits come from and withdrawals go.")
			LiveCard {
				ForEach(Array(LiveAccount.bankOptions.enumerated()), id: \.offset) { i, option in
					Button { bank = i } label: {
						HStack {
							Text(option.0).font(StakFont.geist(13 * u, .medium)).foregroundStyle(StakColors.textPrimary)
							Spacer()
							Text("••\(option.1)").font(StakFont.geist(12 * u)).foregroundStyle(Live.muted).padding(.trailing, 10 * u)
							Text(bank == i ? "✓" : "").font(StakFont.geist(14 * u, .medium)).foregroundStyle(Live.teal)
						}
						.frame(height: 44 * u)
						.contentShape(Rectangle())
					}
					.buttonStyle(.pressDim)
				}
			}
			LiveCaption(text: "The demo links a sample account instantly. In production this opens your bank’s secure sign-in.")
			AuthCta(text: "Link", enabled: bank >= 0, action: {
				let option = LiveAccount.bankOptions[bank]
				account.linkBank(option.0, last4: option.1)
				step = .funds
			})
		}
	}

	private var fundsStep: some View {
		Group {
			StepHeader(kicker: "FUNDING", title: "Add funds", body: "From \(account.bankName) ••\(account.bankLast4). Deposits usually clear in a moment here; 1–3 business days for real.")
			AmountChips(presets: [50, 100, 500], selected: fundAmount, onSelect: { fundAmount = $0; fundCustom = false }, customOn: fundCustom, onCustom: { fundCustom = true; fundAmount = Double(fundText) ?? 0 })
			if fundCustom {
				AuthInput("Amount in USD", text: $fundText, keyboard: .decimalPad)
					.onChange(of: fundText) { _, next in
						let clean = String(next.filter { $0.isNumber || $0 == "." }.prefix(9))
						if clean != next { fundText = clean }
						fundAmount = Double(clean) ?? 0
					}
			}
			LiveRow(label: "You add", value: LiveAccount.usd(fundAmount))
			AuthCta(text: "Add funds", enabled: fundAmount > 0, action: { depositId = account.deposit(fundAmount); step = .processing })
		}
	}

	private var processingStep: some View {
		LiveCard {
			LiveKicker(text: "PROCESSING", color: Live.amber)
			LiveTitle(text: "Moving \(LiveAccount.usd(fundAmount))")
			LiveBody(text: "Your bank is sending the money. Cash shows as available the moment it lands.")
		}
		.afterDelay(depositId, millis: 2000) { account.settle(depositId); step = .ready }
	}

	private var readyStep: some View {
		Group {
			LiveCard {
				LiveKicker(text: "CASH AVAILABLE", color: Live.green)
				LiveTitle(text: LiveAccount.usd(account.cash))
				LiveBody(text: "Your deposit landed. Turn real money on and Stock Detail’s Buy places live orders from here.")
			}
			AuthCta(text: "Turn real money on", action: { account.goLive(); step = .on })
		}
	}

	private var onStep: some View {
		Group {
			LiveCard {
				LiveKicker(text: "REAL MONEY ON", color: Live.green)
				LiveTitle(text: "You’re live")
				LiveBody(text: "Buys and sells now use your \(LiveAccount.usd(account.cash)) of real cash. Practice trades still run in Simulate, and your paper portfolio is untouched.")
			}
			AuthCta(text: "Go to your account", action: onOpenAccount)
			LiveSecondary(text: "Done", action: onBack)
		}
	}
}

private struct StepHeader: View {
	let kicker: String
	let title: String
	let body_: String

	init(kicker: String, title: String, body: String) {
		self.kicker = kicker
		self.title = title
		self.body_ = body
	}

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 6 * u) {
			LiveKicker(text: kicker)
			LiveTitle(text: title)
			LiveBody(text: body_)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(.bottom, 4 * u)
	}
}

private struct ChangeRow: View {
	let title: String
	let body_: String

	init(title: String, body: String) {
		self.title = title
		self.body_ = body
	}

	var body: some View {
		let u = figmaUnit
		VStack(alignment: .leading, spacing: 2 * u) {
			Text(title).font(StakFont.sora(14 * u, .semiBold)).foregroundStyle(StakColors.textPrimary)
			LiveCaption(text: body_)
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(.vertical, 4 * u)
	}
}
