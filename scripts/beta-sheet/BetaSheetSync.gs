/**
 * STAK beta master sheet <- STAK's beta report (POST /api/admin/analytics/beta). Setup (also under STAK -> How to set up):
 *
 *   1. In the sheet: Extensions -> Apps Script. Replace everything in Code.gs with this file and save.
 *   2. In Apps Script: the gear (Project Settings) -> Script properties -> Add script property:
 *      BETA_REPORT_SECRET = the sheet key (ask Goodluck; SECRETS.md "The beta master sheet").
 *   3. Reload the sheet. A "STAK" menu appears: STAK -> Refresh STAK data. The first time, Google asks for permission
 *      ("Google hasn't verified this app" -> Advanced -> Go to ... -> Allow): the script reads this sheet and calls STAK.
 *   4. STAK -> Refresh every morning, to keep it up to date on its own.
 *
 * It reads the testers from TESTERS_SHEET (the "Email" column, and a "STAK email" column when a tester signed up to STAK
 * with another address, e.g. Apple's Hide My Email), asks STAK about them, and rewrites OUTPUT_SHEET: one row per tester,
 * in the tester sheet's order, keyed by the tester sheet's email so other tabs can XLOOKUP it. Nothing else is touched.
 */

const STAK_URL = "https://stak-backend-889057229494.us-central1.run.app/api/admin/analytics/beta";
const TESTERS_SHEET = "Selected Testers";
const OUTPUT_SHEET = "STAK Data";
const STATUS_RANGE_NAME = "StakLastRefresh";

// [column, what it means] - the meaning goes on the header cell as a note. Look columns up by header, not by letter:
// a column may be added later.
const COLUMNS = [
	["email", "The tester's email from " + TESTERS_SHEET + "."],
	["stak_email", "The address looked up in STAK (the STAK email column when filled in, else email)."],
	["has_account", "TRUE when STAK has an account under stak_email. FALSE: none yet, or under another address - fill in their STAK email."],
	["display_name", "The name on their STAK account."],
	["platform", "The app they used most recently: ios, android or web. For \"both devices\" use the tester sheet."],
	["app_version", "The build they used most recently, e.g. \"1.0 (13)\". \"build 12\": an older iPhone build. Blank: the web, or an Android build from before 13 Nov 2026."],
	["signed_up", "When they created their STAK account."],
	["onboarding_completed", "Finished onboarding."],
	["activated", "Finished onboarding, swiped 10+ different companies (companies_swiped), saved 3+ companies by any route (staks), and opened at least one Quick Look or saved company page."],
	["swipes", "Every card swiped, left or right. A passed company can come back, so one company can be swiped more than once."],
	["companies_swiped", "Different companies swiped: repeat swipes of the same company count once. Never more than swipes."],
	["right_swipes", "Swipes to the right (STAK) on Discover cards. Saves made any other way aren't counted here - see staks."],
	["staks", "Different companies they have ever added to My STAK, by any route: a right swipe, a Save button (company page, Quick Look, news) or buying it in Simulate. Each company counts once; removing it later doesn't lower this. Usually much higher than right_swipes, because most saves don't come from swiping."],
	["saved_now", "Companies in their My STAK right now (it holds up to 30). Lower than staks only by the companies they removed and didn't save again."],
	["quick_looks", "Times they tapped Learn more on a Discover card to open its Quick Look - the short pop-up summary, not the full page. On the web it also counts Search Quick Looks and desktop cards left on screen a few seconds."],
	["company_opens", "Times they opened a company's full page (not the Quick Look pop-up), from anywhere: Discover, My STAK, search, news. Opening the same company twice counts twice."],
	["saved_company_opens", "Full company pages opened for a company already in their My STAK at that moment, or opened from the My STAK tab. iPhone and Android only."],
	["news_opens", "News articles opened."],
	["news_tab_views", "Visits to the News tab."],
	["simulate_tab_views", "Visits to the Simulate tab."],
	["sim_trades", "Paper trades made."],
	["simulate_used", "Opened or traded in Simulate."],
	["my_stak_views", "Visits to the My STAK tab (counted from the 10 Nov 2026 builds)."],
	["taste_views", "Times they opened Your Investing Taste."],
	["stak_ai_opens", "Times they opened STAK AI."],
	["stak_ai_questions", "Questions they asked STAK AI (counted on every platform)."],
	["active_days", "Days they used the app."],
	["last_active", "The last day they used the app (Eastern time)."],
	["day3", "Used the app on signup day + 3 (Eastern time). Blank = not due yet, or no account. Retention: COUNTIF(col,TRUE) / (COUNTIF(col,TRUE) + COUNTIF(col,FALSE))."],
	["day7", "Used the app on signup day + 7 (Eastern time). Blank = not due yet, or no account. Retention: COUNTIF(col,TRUE) / (COUNTIF(col,TRUE) + COUNTIF(col,FALSE))."],
];
const TEXT_COLUMNS = ["email", "stak_email", "display_name", "platform", "app_version"];

function onOpen() {
	SpreadsheetApp.getUi()
		.createMenu("STAK")
		.addItem("Refresh STAK data", "menuRefresh")
		.addItem("Refresh every morning", "turnOnDailyRefresh")
		.addItem("Stop the morning refresh", "turnOffDailyRefresh")
		.addSeparator()
		.addItem("How to set up", "showSetup")
		.addToUi();
}

/** From the menu: says how it went. */
function menuRefresh() {
	const ui = SpreadsheetApp.getUi();
	try {
		const done = refresh_();
		SpreadsheetApp.getActiveSpreadsheet().toast(done, "STAK data updated", 8);
	} catch (e) {
		ui.alert("STAK data wasn't updated", e.message, ui.ButtonSet.OK);
	}
}

/** From the morning trigger: a failure throws, so Google emails whoever turned the refresh on. */
function refreshStakData() {
	try {
		refresh_();
	} catch (e) {
		throw new Error("STAK beta sheet: the morning refresh failed - " + e.message);
	}
}

function refresh_() {
	const lock = LockService.getScriptLock();
	if (!lock.tryLock(30000)) throw new Error("Another refresh is running - try again in a minute.");
	const book = SpreadsheetApp.getActiveSpreadsheet();
	try {
		const done = writeReport_(book);
		setStatus_(book, "Last refreshed " + now_(book) + " - " + done, false);
		return done;
	} catch (e) {
		setStatus_(book, "Last refresh FAILED " + now_(book) + " - " + e.message + " (the data below is from the last good refresh)", true);
		throw e;
	} finally {
		lock.releaseLock();
	}
}

function writeReport_(book) {
	const secret = (PropertiesService.getScriptProperties().getProperty("BETA_REPORT_SECRET") || "").trim();
	if (!secret) {
		throw new Error("No sheet key yet. Extensions -> Apps Script -> gear (Project Settings) -> Script properties -> "
			+ "Add script property: BETA_REPORT_SECRET (ask Goodluck for the value).");
	}
	const testers = readTesters_(book);
	const lookups = [...new Set(testers.map((t) => t.stakEmail))];
	if (lookups.length > 2000) throw new Error("STAK takes at most 2000 testers at once (" + lookups.length + " here).");

	let res;
	try {
		res = UrlFetchApp.fetch(STAK_URL, {
			method: "post",
			contentType: "application/json",
			headers: { "x-report-secret": secret },
			payload: JSON.stringify({ emails: lookups }),
			muteHttpExceptions: true,
		});
	} catch (e) {
		throw new Error("Couldn't reach STAK (" + e.message + "). Try again in a few minutes.");
	}
	const code = res.getResponseCode();
	if (code === 403) throw new Error("STAK refused the sheet key. Check BETA_REPORT_SECRET in Script properties, or ask Goodluck whether the key is live.");
	if (code !== 200) throw new Error("STAK had a problem (" + code + "). Try again in a few minutes; tell Goodluck if it keeps happening.");
	const report = JSON.parse(res.getContentText());

	const byEmail = {};
	report.rows.forEach((r) => { byEmail[String(r.email).toLowerCase()] = r; });
	const rows = testers.map((t) => {
		const r = byEmail[t.stakEmail];
		return COLUMNS.map(([c]) => {
			if (c === "email") return t.email;
			if (c === "stak_email") return t.stakEmail;
			if (c === "has_account") return !!r;
			if (!r) return "";
			if (c === "signed_up") return r.created_at ? new Date(r.created_at) : "";
			if (c === "last_active") return r.last_active ? dateOnly_(r.last_active) : "";
			return r[c] === null || r[c] === undefined ? "" : r[c];
		});
	});

	const out = book.getSheetByName(OUTPUT_SHEET) || book.insertSheet(OUTPUT_SHEET);
	const width = COLUMNS.length;
	out.getRange(1, 1, out.getMaxRows(), width).clearContent();
	const header = out.getRange(1, 1, 1, width);
	header.setValues([COLUMNS.map(([c]) => c)]).setFontWeight("bold");
	header.setNotes([COLUMNS.map(([, note]) => note)]);
	if (rows.length) {
		const col = (name) => COLUMNS.findIndex(([c]) => c === name) + 1;
		// Text stays text: a name like "007" or "3/4" isn't turned into a number or a date.
		TEXT_COLUMNS.forEach((name) => out.getRange(2, col(name), rows.length, 1).setNumberFormat("@"));
		out.getRange(2, col("signed_up"), rows.length, 1).setNumberFormat("yyyy-mm-dd hh:mm");
		out.getRange(2, col("last_active"), rows.length, 1).setNumberFormat("yyyy-mm-dd");
		out.getRange(2, 1, rows.length, width).setValues(rows);
	}
	out.setFrozenRows(1);
	out.setFrozenColumns(1);
	out.autoResizeColumns(1, width);

	const withAccount = rows.filter((r) => r[2] === true).length;
	const without = testers.length - withAccount;
	return testers.length + " testers, " + withAccount + " with a STAK account, " + report.activated + " activated"
		+ (without ? ". " + without + " have no STAK account under that email - add their STAK email in " + TESTERS_SHEET + " if they signed up with another." : ".");
}

/**
 * The testers: the "Email" column (an exact header, else the first header mentioning email) and, when present, a
 * "STAK email" column for those who signed up to STAK under another address. Once each, in sheet order.
 */
function readTesters_(book) {
	const sheet = book.getSheetByName(TESTERS_SHEET);
	if (!sheet) throw new Error('No tab named "' + TESTERS_SHEET + '" - change TESTERS_SHEET at the top of the script.');
	const values = sheet.getDataRange().getValues();
	const headers = values[0].map((h) => String(h).trim());
	const stakCol = headers.findIndex((h) => /^stak\s*e-?mail$/i.test(h));
	let emailCol = headers.findIndex((h) => /^e-?mail(\s*address)?$/i.test(h));
	if (emailCol < 0) emailCol = headers.findIndex((h, i) => i !== stakCol && /e-?mail/i.test(h));
	if (emailCol < 0) throw new Error('No "Email" column in "' + TESTERS_SHEET + '".');

	const seen = {};
	const testers = [];
	values.slice(1).forEach((row) => {
		const email = String(row[emailCol]).trim();
		const key = email.toLowerCase();
		if (key.indexOf("@") < 1 || seen[key]) return;
		seen[key] = true;
		const stak = stakCol >= 0 ? String(row[stakCol]).trim().toLowerCase() : "";
		testers.push({ email: email, stakEmail: stak.indexOf("@") > 0 ? stak : key });
	});
	if (testers.length === 0) throw new Error('No emails in the "' + headers[emailCol] + '" column of "' + TESTERS_SHEET + '".');
	return testers;
}

/** The status line, in a cell next to the data (named StakLastRefresh, so the Dashboard can show it); red on a failure. */
function setStatus_(book, text, failed) {
	const out = book.getSheetByName(OUTPUT_SHEET) || book.insertSheet(OUTPUT_SHEET);
	// One empty column past the data. When columns are added the cell moves along, so it never sits on a header.
	const cell = out.getRange(1, COLUMNS.length + 2);
	const named = book.getRangeByName(STATUS_RANGE_NAME);
	if (!named || named.getA1Notation() !== cell.getA1Notation() || named.getSheet().getName() !== OUTPUT_SHEET) {
		if (named && named.getSheet().getName() === OUTPUT_SHEET) {
			// Where it was: past the data, emptied; on what is now a header, only its red/green taken off.
			if (named.getColumn() > COLUMNS.length) named.clearContent().clearFormat();
			else named.setFontColor(null);
		}
		book.setNamedRange(STATUS_RANGE_NAME, cell);
	}
	cell.setValue(text).setFontColor(failed ? "#c5221f" : "#188038").setFontWeight("bold");
}

function now_(book) {
	return Utilities.formatDate(new Date(), book.getSpreadsheetTimeZone(), "d MMM HH:mm");
}

/** "2026-11-10" as that calendar day, not midnight UTC shifted into the sheet's time zone. */
function dateOnly_(ymd) {
	const [y, m, d] = ymd.split("-").map(Number);
	return new Date(y, m - 1, d);
}

function turnOnDailyRefresh() {
	removeTriggers_();
	ScriptApp.newTrigger("refreshStakData").timeBased().everyDays(1).atHour(7).create();
	SpreadsheetApp.getActiveSpreadsheet().toast(
		"Refreshes every morning around 7am (" + Session.getScriptTimeZone() + "). If a refresh fails, Google emails "
		+ Session.getEffectiveUser().getEmail() + ".", "Morning refresh is on", 10);
}

function turnOffDailyRefresh() {
	const removed = removeTriggers_();
	SpreadsheetApp.getActiveSpreadsheet().toast(removed
		? "Morning refresh is off."
		: "You have no morning refresh on. If someone else turned it on, they have to turn it off.", "STAK", 8);
}

/** Removes this user's morning refreshes (Apps Script only shows each person their own triggers). */
function removeTriggers_() {
	const mine = ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === "refreshStakData");
	mine.forEach((t) => ScriptApp.deleteTrigger(t));
	return mine.length;
}

function showSetup() {
	const ui = SpreadsheetApp.getUi();
	ui.alert("Setting up STAK data",
		"1. Extensions -> Apps Script -> gear (Project Settings) -> Script properties -> Add script property: "
		+ "BETA_REPORT_SECRET = the sheet key (ask Goodluck).\n\n"
		+ "2. STAK -> Refresh STAK data. The first time Google asks for permission: \"Google hasn't verified this app\" "
		+ "-> Advanced -> Go to ... -> Allow.\n\n"
		+ "3. STAK -> Refresh every morning.\n\n"
		+ "Testers come from the \"Email\" column of " + TESTERS_SHEET + ". If someone signed up to STAK with another "
		+ "address, add a \"STAK email\" column there with it.\n\n"
		+ "Other tabs: look testers up by email in " + OUTPUT_SHEET + ", and columns by their header name. Hover a header "
		+ "to see what it means. Don't edit " + OUTPUT_SHEET + ": each refresh rewrites it.",
		ui.ButtonSet.OK);
}
