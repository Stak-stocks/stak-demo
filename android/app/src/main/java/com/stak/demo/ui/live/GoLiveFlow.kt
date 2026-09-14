package com.stak.demo.ui.live

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.stak.demo.ui.onboarding.AuthCta
import com.stak.demo.ui.onboarding.AuthInput
import com.stak.demo.ui.onboarding.PermissionCard
import com.stak.demo.ui.onboarding.ShowHideToggle
import com.stak.demo.ui.onboarding.figmaUnit
import com.stak.demo.ui.profile.SettingsChip
import com.stak.demo.ui.theme.Geist
import com.stak.demo.ui.theme.Sora

/** The Go live steps (FigJam "STAK · Go live to buy and sell": Tap Go live -> intro -> KYC x4 -> Under review -> Verified? -> Link -> Add funds -> Processing -> Cash available -> Real money ON). */
private object Step {
	const val INTRO = "intro"
	const val NAME = "name"
	const val ADDRESS = "address"
	const val SSN = "ssn"
	const val AGREE = "agree"
	const val REVIEW = "review"
	const val RESULT = "result"
	const val BANK = "bank"
	const val FUNDS = "funds"
	const val PROCESSING = "processing"
	const val READY = "ready"
	const val ON = "on"
}

private val EMPLOYMENT = listOf("Employed", "Self-employed", "Student", "Retired", "Not working")

/**
 * Go live (FigJam Full Cascade copies, 2026-09-14). One page that walks the
 * board's steps in order and resumes where the account left off: an account
 * under review lands on Under review, a verified one on Link / Add funds. The
 * demo verifier rejects applicants under 18 (the board's Rejected -> Fix &
 * resubmit -> re-enter details edge). Mirrors ios Live/GoLiveFlow.swift.
 */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
internal fun GoLiveFlow(onBack: () -> Unit, onOpenAccount: () -> Unit) {
	val u = figmaUnit()
	var step by rememberSaveable {
		mutableStateOf(
			when (LiveAccount.status) {
				LiveStatus.REVIEW -> Step.REVIEW
				LiveStatus.REJECTED -> Step.RESULT
				LiveStatus.VERIFIED -> if (!LiveAccount.bankLinked) Step.BANK else if (LiveAccount.cash > 0.0) Step.READY else Step.FUNDS
				LiveStatus.LIVE -> Step.ON
				else -> Step.INTRO
			},
		)
	}
	// The KYC form - prefilled from a rejected application so Fix & resubmit re-enters the details.
	val k = LiveAccount.kyc
	var first by rememberSaveable { mutableStateOf(k.firstName) }
	var last by rememberSaveable { mutableStateOf(k.lastName) }
	var dob by rememberSaveable { mutableStateOf(k.dob) }
	var street by rememberSaveable { mutableStateOf(k.street) }
	var city by rememberSaveable { mutableStateOf(k.city) }
	var state by rememberSaveable { mutableStateOf(k.state) }
	var zip by rememberSaveable { mutableStateOf(k.zip) }
	var ssn by rememberSaveable { mutableStateOf("") }
	var showSsn by rememberSaveable { mutableStateOf(false) }
	var employment by rememberSaveable { mutableStateOf(k.employment) }
	var attempted by rememberSaveable { mutableStateOf(false) }
	var agreeCustomer by rememberSaveable { mutableStateOf(false) }
	var agreeRisk by rememberSaveable { mutableStateOf(false) }
	var agreePrivacy by rememberSaveable { mutableStateOf(false) }
	var bank by rememberSaveable { mutableStateOf(-1) }
	var fundAmount by rememberSaveable { mutableStateOf(100.0) }
	var fundCustom by rememberSaveable { mutableStateOf(false) }
	var fundText by rememberSaveable { mutableStateOf("") }
	var depositId by rememberSaveable { mutableStateOf("") }

	val back: () -> Unit = {
		attempted = false
		when (step) {
			Step.NAME -> step = Step.INTRO
			Step.ADDRESS -> step = Step.NAME
			Step.SSN -> step = Step.ADDRESS
			Step.AGREE -> step = Step.SSN
			Step.FUNDS -> if (depositId.isEmpty()) step = Step.BANK else onBack()
			else -> onBack()
		}
	}
	androidx.activity.compose.BackHandler(onBack = back)

	val title = when (step) {
		Step.INTRO -> "Go live"
		Step.NAME, Step.ADDRESS, Step.SSN, Step.AGREE -> "Identity check"
		Step.REVIEW, Step.RESULT -> "Identity check"
		Step.BANK, Step.FUNDS, Step.PROCESSING, Step.READY -> "Fund account"
		else -> "Real money"
	}
	LivePage(title = title, onBack = back) {
		when (step) {
			Step.INTRO -> {
				LiveCard {
					LiveKicker("WHAT CHANGES")
					LiveTitle("Trade with real money")
					LiveBody("Your saves, deck and lessons stay the same. Buys and sells on a live account move real cash through STAK’s brokerage partner.")
				}
				LiveCard {
					ChangeRow("Real cash", "You fund the account from a bank or card and can withdraw any time.")
					ChangeRow("Same picks", "Stock Detail’s Buy becomes a live order ticket. Practice trading stays in Simulate.")
					ChangeRow("Identity first", "A short identity check is required by law before any money moves.")
				}
				Spacer(modifier = Modifier.height((4 * u).dp))
				AuthCta(text = "Start", onClick = { step = Step.NAME })
				LiveSecondary("Not now", onClick = onBack)
			}
			Step.NAME -> {
				StepHeader("STEP 1 OF 4", "Your name and date of birth", "Exactly as they appear on your ID.")
				AuthInput(value = first, onValueChange = { first = it }, placeholder = "First name", error = if (attempted && first.isBlank()) "Enter your first name" else null)
				AuthInput(value = last, onValueChange = { last = it }, placeholder = "Last name", error = if (attempted && last.isBlank()) "Enter your last name" else null)
				val dobError = when {
					dob.isBlank() -> "Enter your date of birth"
					LiveAccount.ageOf(dob) == null -> "Use the form YYYY-MM-DD"
					else -> null
				}
				AuthInput(value = dob, onValueChange = { dob = it.filter { c -> c.isDigit() || c == '-' }.take(10) }, placeholder = "Date of birth (YYYY-MM-DD)", keyboardType = KeyboardType.Number, error = if (attempted) dobError else null)
				AuthCta(text = "Continue", enabled = first.isNotBlank() && last.isNotBlank() && dob.isNotBlank(), onClick = {
					attempted = true
					if (first.isNotBlank() && last.isNotBlank() && dobError == null) { attempted = false; step = Step.ADDRESS }
				})
			}
			Step.ADDRESS -> {
				StepHeader("STEP 2 OF 4", "Where you live", "Your statements and tax forms go here.")
				AuthInput(value = street, onValueChange = { street = it }, placeholder = "Street address", error = if (attempted && street.isBlank()) "Enter your street address" else null)
				AuthInput(value = city, onValueChange = { city = it }, placeholder = "City", error = if (attempted && city.isBlank()) "Enter your city" else null)
				Row(horizontalArrangement = Arrangement.spacedBy((10 * u).dp)) {
					Column(modifier = Modifier.weight(1f)) { AuthInput(value = state, onValueChange = { state = it.take(2).uppercase() }, placeholder = "State", error = if (attempted && state.length != 2) "2 letters" else null) }
					Column(modifier = Modifier.weight(1f)) { AuthInput(value = zip, onValueChange = { zip = it.filter { c -> c.isDigit() }.take(5) }, placeholder = "ZIP", keyboardType = KeyboardType.Number, error = if (attempted && zip.length != 5) "5 digits" else null) }
				}
				AuthCta(text = "Continue", enabled = street.isNotBlank() && city.isNotBlank() && state.isNotBlank() && zip.isNotBlank(), onClick = {
					attempted = true
					if (street.isNotBlank() && city.isNotBlank() && state.length == 2 && zip.length == 5) { attempted = false; step = Step.SSN }
				})
			}
			Step.SSN -> {
				StepHeader("STEP 3 OF 4", "Social Security number and work", "Required to open a brokerage account. Your SSN is sent for verification and never stored on this phone.")
				AuthInput(
					value = ssn,
					onValueChange = { ssn = it.filter { c -> c.isDigit() }.take(9) },
					placeholder = "SSN (9 digits)",
					keyboardType = KeyboardType.Number,
					hidden = !showSsn,
					trailing = { ShowHideToggle(shown = showSsn, onToggle = { showSsn = !showSsn }) },
					error = if (attempted && !LiveAccount.ssnValid(ssn)) "Enter all 9 digits" else null,
				)
				Text("Employment", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White, modifier = Modifier.padding(top = (4 * u).dp))
				androidx.compose.foundation.layout.FlowRow(horizontalArrangement = Arrangement.spacedBy((8 * u).dp), verticalArrangement = Arrangement.spacedBy((8 * u).dp)) {
					EMPLOYMENT.forEach { e -> SettingsChip(label = e, selected = employment == e) { employment = e } }
				}
				if (attempted && employment.isBlank()) LiveBody("Choose your employment status", color = Live.Red)
				AuthCta(text = "Continue", enabled = ssn.isNotEmpty() && employment.isNotBlank(), onClick = {
					attempted = true
					if (LiveAccount.ssnValid(ssn) && employment.isNotBlank()) { attempted = false; step = Step.AGREE }
				})
			}
			Step.AGREE -> {
				StepHeader("STEP 4 OF 4", "Agreements", "Read and accept these to open the account.")
				PermissionCard("Customer agreement", "The terms of your brokerage account with STAK’s partner.", agreeCustomer) { agreeCustomer = !agreeCustomer }
				PermissionCard("Risk disclosure", "Stocks can lose value. You can lose money you invest.", agreeRisk) { agreeRisk = !agreeRisk }
				PermissionCard("Privacy notice", "How your identity details are used and protected.", agreePrivacy) { agreePrivacy = !agreePrivacy }
				AuthCta(text = "Submit for review", enabled = agreeCustomer && agreeRisk && agreePrivacy, onClick = {
					val ok = LiveAccount.submit(KycProfile(first.trim(), last.trim(), dob.trim(), street.trim(), city.trim(), state.trim(), zip.trim(), employment), ssn)
					ssn = ""
					if (ok) step = Step.REVIEW
				})
			}
			Step.REVIEW -> {
				// The demo verifier answers after a moment (FigJam: Under review -> Verified?).
				AfterDelay(key = step, millis = 2200) { LiveAccount.resolveReview(); step = Step.RESULT }
				LiveCard {
					LiveKicker("UNDER REVIEW", color = Live.Amber)
					LiveTitle("Checking your details")
					LiveBody("We’re verifying ${LiveAccount.kyc.fullName.ifBlank { "your identity" }} with our partner. This usually takes a moment; we’ll let you know either way.")
				}
				LiveCaption("You can leave this page. The result shows on your Profile.")
			}
			Step.RESULT -> {
				if (LiveAccount.status == LiveStatus.REJECTED) {
					LiveCard {
						LiveKicker("NOT VERIFIED", color = Live.Red)
						LiveTitle("We couldn’t verify you")
						LiveBody(LiveAccount.rejectionReason)
					}
					AuthCta(text = "Fix & resubmit", onClick = { attempted = false; agreeCustomer = false; agreeRisk = false; agreePrivacy = false; step = Step.NAME })
					LiveSecondary("Back", onClick = onBack)
				} else {
					LiveCard {
						LiveKicker("VERIFIED", color = Live.Green)
						LiveTitle("You’re verified")
						LiveBody("Your identity checked out. Link a bank or card to fund the account.")
					}
					AuthCta(text = "Link a bank", onClick = { step = Step.BANK })
				}
			}
			Step.BANK -> {
				StepHeader("FUNDING", "Link a card or bank", "Where deposits come from and withdrawals go.")
				LiveCard {
					LiveAccount.BANK_OPTIONS.forEachIndexed { i, (name, last4) ->
						Row(
							verticalAlignment = Alignment.CenterVertically,
							modifier = Modifier.fillMaxWidth().height((44 * u).dp).clickable(interactionSource = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() }, indication = com.stak.demo.ui.theme.PressDim) { bank = i },
						) {
							Text(name, style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (13 * u).sp), color = Color.White)
							Spacer(modifier = Modifier.weight(1f))
							Text("••$last4", style = TextStyle(fontFamily = Geist, fontSize = (12 * u).sp), color = Live.Muted, modifier = Modifier.padding(end = (10 * u).dp))
							Text(if (bank == i) "✓" else "", style = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Medium, fontSize = (14 * u).sp), color = Live.Teal)
						}
					}
				}
				LiveCaption("The demo links a sample account instantly. In production this opens your bank’s secure sign-in.")
				AuthCta(text = "Link", enabled = bank >= 0, onClick = {
					val (name, last4) = LiveAccount.BANK_OPTIONS[bank]
					LiveAccount.linkBank(name, last4)
					step = Step.FUNDS
				})
			}
			Step.FUNDS -> {
				StepHeader("FUNDING", "Add funds", "From ${LiveAccount.bankName} ••${LiveAccount.bankLast4}. Deposits usually clear in a moment here; 1–3 business days for real.")
				AmountChips(presets = listOf(50.0, 100.0, 500.0), selected = fundAmount, onSelect = { fundAmount = it; fundCustom = false }, customOn = fundCustom, onCustom = { fundCustom = true })
				if (fundCustom) {
					AuthInput(value = fundText, onValueChange = { fundText = it.filter { c -> c.isDigit() || c == '.' }.take(9); fundAmount = fundText.toDoubleOrNull() ?: 0.0 }, placeholder = "Amount in USD", keyboardType = KeyboardType.Decimal)
				}
				LiveRow("You add", LiveAccount.usd(fundAmount))
				AuthCta(text = "Add funds", enabled = fundAmount > 0.0, onClick = { depositId = LiveAccount.deposit(fundAmount); step = Step.PROCESSING })
			}
			Step.PROCESSING -> {
				AfterDelay(key = depositId, millis = 2000) { LiveAccount.settle(depositId); step = Step.READY }
				LiveCard {
					LiveKicker("PROCESSING", color = Live.Amber)
					LiveTitle("Moving ${LiveAccount.usd(fundAmount)}")
					LiveBody("Your bank is sending the money. Cash shows as available the moment it lands.")
				}
			}
			Step.READY -> {
				LiveCard {
					LiveKicker("CASH AVAILABLE", color = Live.Green)
					LiveTitle(LiveAccount.usd(LiveAccount.cash))
					LiveBody("Your deposit landed. Turn real money on and Stock Detail’s Buy places live orders from here.")
				}
				AuthCta(text = "Turn real money on", onClick = { LiveAccount.goLive(); step = Step.ON })
			}
			else -> {
				LiveCard {
					LiveKicker("REAL MONEY ON", color = Live.Green)
					LiveTitle("You’re live")
					LiveBody("Buys and sells now use your ${LiveAccount.usd(LiveAccount.cash)} of real cash. Practice trades still run in Simulate, and your paper portfolio is untouched.")
				}
				AuthCta(text = "Go to your account", onClick = onOpenAccount)
				LiveSecondary("Done", onClick = onBack)
			}
		}
	}
}

@Composable
private fun StepHeader(kicker: String, title: String, body: String) {
	Column(verticalArrangement = Arrangement.spacedBy((6 * figmaUnit()).dp), modifier = Modifier.fillMaxWidth().padding(bottom = (4 * figmaUnit()).dp)) {
		LiveKicker(kicker)
		LiveTitle(title)
		LiveBody(body)
	}
}

@Composable
private fun ChangeRow(title: String, body: String) {
	val u = figmaUnit()
	Column(verticalArrangement = Arrangement.spacedBy((2 * u).dp), modifier = Modifier.fillMaxWidth().padding(vertical = (4 * u).dp)) {
		Text(title, style = TextStyle(fontFamily = Sora, fontWeight = FontWeight.SemiBold, fontSize = (14 * u).sp), color = Color.White)
		LiveCaption(body)
	}
}
