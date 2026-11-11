import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { deleteUser } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { useId, useState } from "react";
import { toast } from "sonner";
import { col } from "@/app/FitCanvas";
import { wholeMoney } from "@/app/live/format";
import { localKey } from "@/app/live/guest";
import { useStanding } from "@/app/live/rank";
import { useShowcase } from "@/app/live/showcase";
import { useLive } from "@/app/live/store";
import { resetNotificationSettings, settingsKey } from "@/app/notifications/settings";
import { PageHeader } from "@/app/PageHeader";
import { P } from "@/app/profile/assets";
import { HELP_PATH, NOTIFICATION_SETTINGS_PATH, profile } from "@/app/profile/data";
import { extrasKey, investorSince, resetProfileExtras, useIdentity } from "@/app/profile/identity";
import { useNotificationsPanel } from "@/app/profile/notifications";
import { useProfileStats } from "@/app/profile/stats";
import { CHEVRON, GhostRowButton, HUG, RowLabel, RowValue, rowName, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { GhostButton } from "@/app/simulate/ui";
import { outsideHairline, PrimaryButton } from "@/app/ui/Button";
import { Sheet } from "@/app/ui/Sheet";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/_app/profile")({
	component: ProfilePage,
});

/**
 * The ACCOUNT card's rows (2:2528, 2:2534, 2:2540, 2:2546), in Figma's order: each icon is Figma's own file. Notifications
 * and Contact support open the two pages both phones open behind them (android ui/profile/ProfileScreen.kt:125-126 ->
 * StakNavHost.kt:680 / 737-742 -> SettingsScreens.kt:137-207; ios ProfileView.swift:67-68 -> MainTabsView.swift:348 /
 * 391-392 -> SettingsViews.swift:124-243): the notification settings and Help & support. The bell keeps the inbox.
 */
const ACCOUNT_ROWS = [
	{ icon: P.notifications, href: NOTIFICATION_SETTINGS_PATH, external: false },
	{ icon: P.support, href: HELP_PATH, external: false },
	{ icon: P.terms, href: "https://thestak.org/terms", external: true },
	{ icon: P.privacy, href: "https://thestak.org/privacy", external: true },
];

/** Forgets what this browser keeps for an account or the guest beyond the live store: the handle, the photo, the notification settings. */
function forgetLocalProfile(uid: string | null) {
	resetProfileExtras(uid);
	resetNotificationSettings(uid);
	if (!uid) return; // the guest keeps its (default) keys: the demo starts over
	try {
		localStorage.removeItem(extrasKey(uid));
		localStorage.removeItem(settingsKey(uid));
	} catch {
		/* storage unavailable */
	}
}

/**
 * Edit profile's 1px inside stroke past 2560 (SPEC G2: the big regime scales the 2560 layout evenly). Chrome snaps a CSS
 * border to whole device pixels, so under the canvas zoom of a 4K screen (1.5) the 1px border paints 1 device pixel, not
 * 1.5, and the button came out 1 device pixel narrower and shorter than 2560 x 1.5 (and the row beside it 1 wider). There
 * (html[data-stak-size="big"] exists only past 2560) the stroke is the same white 14% ring drawn as an inset shadow,
 * which is not snapped, and the padding takes the border's pixel: the box is Figma's 96 x 37 times the zoom. Up to 2560
 * the selector never matches: the approved border is untouched.
 */
const EDIT_STROKE_BIG =
	"[html[data-stak-size=big]_&]:border-0 [html[data-stak-size=big]_&]:px-[15px] [html[data-stak-size=big]_&]:py-[10px] [html[data-stak-size=big]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]";

/** An ACCOUNT row's left side (2:2529 "left"): the 20px icon, 10 apart from the label. */
function IconLabel({ icon, children }: { icon: string; children: string }) {
	return (
		<span className="flex items-center gap-[10px] overflow-clip">
			<img alt="" src={icon} className="size-[20px]" width={20} height={20} />
			<RowLabel>{children}</RowLabel>
		</span>
	);
}

/**
 * Figma 2:2476 "Desktop · Profile": 640px column of settings cards, every value read from the account.
 *
 * Wiring: the frame carries no reactions and the phone's hub (1:5665) wires only Back, so each control goes where its
 * label says: Edit profile -> 2:2555, the YOUR STAK rows -> Taste & risk 2:2760, Portfolio 2:743, Leaderboard 2:920; the
 * ACCOUNT rows -> the notification settings and Help & support pages (as both phones), Terms and Privacy; the bell
 * opens the notifications panel (2:2611) in place; Log out -> Sign in (2:5664).
 */
function ProfilePage() {
	const me = useIdentity();
	const stats = useProfileStats();
	const standing = useStanding();
	const live = useLive();
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const notifications = useNotificationsPanel();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const deleteTitleId = useId();
	const deleteBodyId = useId();

	const showcase = useShowcase();
	/**
	 * "Leaderboard rank" (2:2523 / 2:2525): one rank everywhere (D4, live/rank.ts): the leaderboard's This week rank, or
	 * "Unranked" before the first paper trade, as Simulate's empty hero and both phones' hubs say it (android
	 * ProfileScreen.kt:121 with simulate/PaperPortfolio.kt:115-116; ios ProfileView.swift:63). The untouched demo persona
	 * shows the frame's copy (its computed rank is the frame's #47).
	 */
	const rankValue = standing.showcase
		? profile.yourStak.rows[2].value
		: standing.ranked && standing.week.rank !== null
			? `#${standing.week.rank} this week  ${CHEVRON}`
			: `Unranked  ${CHEVRON}`;
	const yourStak = [
		{ label: profile.yourStak.rows[0].label, value: `${stats.taste.summary}  ${CHEVRON}`, href: "/profile/taste-risk" },
		// the untouched demo persona shows the frame's figure (live/showcase.ts)
		{ label: profile.yourStak.rows[1].label, value: showcase ? profile.yourStak.rows[1].value : `${wholeMoney(stats.value)}  ${CHEVRON}`, href: "/simulate/portfolio" },
		{ label: profile.yourStak.rows[2].label, value: rankValue, href: "/simulate/leaderboard" },
	];

	// Log out -> Sign in (2:5664), which is the confirmation (Figma draws no toast for this flow). It ERASES NOTHING: an
	// account's session ends and its data stays with the account; a signed-out visitor has no session to end, so the
	// button only leaves for Sign in and everything this browser keeps stays as it is (the saves, the paper trades, the
	// taste, the handle, the photo, the notification settings): the browser's Back returns to the same portfolio. Both
	// phones work so: Log out forgets the session and the stored ledger is there on the way back (android
	// navigation/StakNavHost.kt:683-684 onLogOut -> ui/Session.kt:169 signOut; ui/simulate/PaperPortfolio.kt restores
	// it; ios Session.swift:150 signOut); only Delete account wipes it (Session.kt:163-166 deleteAccount ->
	// StakStore.clearAccount; ios Session.swift:144). The website's guest
	// Log out used to reset the demo with one click and no question (the hunt's I-02, HIGH; coordinator ruling N29b):
	// Delete account below is the one reset, and it asks first.
	async function handleLogout() {
		if (user) await logout().catch(() => {});
		navigate({ to: "/login" });
	}

	async function confirmDeletion() {
		setDeleting(true);
		try {
			if (user) {
				// the person's data goes with the account: the user document (saves, paper portfolio, taste, XP) and this browser's
				// local stores (the sold log and deck progress, the handle and photo, the notification settings)
				await deleteDoc(doc(db, "users", user.uid));
				try {
					localStorage.removeItem(localKey(user.uid));
				} catch {
					/* storage unavailable */
				}
				forgetLocalProfile(user.uid);
				await deleteUser(user);
			} else {
				live.actions.resetGuest();
				forgetLocalProfile(null);
			}
			// Sign up is the confirmation (Figma draws no toast for this flow)
			navigate({ to: "/signup" });
		} catch (error) {
			const code = (error as { code?: string }).code ?? "";
			if (code.includes("requires-recent-login")) {
				toast.error("Sign in again, then delete your account");
				await logout().catch(() => {});
				navigate({ to: "/login" });
			} else {
				toast.error("Could not delete the account. Try again.");
			}
		} finally {
			setDeleting(false);
			setConfirmDelete(false);
		}
	}

	return (
		<div className="relative flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={profile.title} onBell={notifications.toggle} />
			{notifications.panel}
			<div className="flex flex-col items-start gap-[16px]" style={{ width: col(640) }}>
				{/* "identity" 2:2507: 88 tall, 5px left inset, 16 gaps, centred. Nothing in it overflows, so it does not clip:
				    Edit profile's focus ring reaches past the column's right edge.
				    Below 1024 (SPEC R1 / R2 / R7) every piece keeps Figma's size and the reading order stays avatar, name, handle,
				    Edit profile. While the three fit the column (tablets, wide phones) the row is the frame's: Edit profile at its
				    right end. On a narrower phone Edit profile (still Figma's hugging 96 x 37) moves under the handle line instead
				    of squeezing it, and a handle line wider than the column wraps, balanced, instead of being clipped. The wrapper
				    that lets Edit profile wrap is display: contents from 1024 up (no box: the approved row is untouched there). */}
				<div className="flex h-[88px] w-full items-center gap-[16px] pl-[5px] max-lg:h-auto max-lg:min-h-[88px] max-lg:py-[8px]">
					{/* the 72px avatar's 2px #66b7da stroke sits OUTSIDE it (a 76px ring, Figma 2:2508), so it is drawn outside the box;
					    the photo the person chose on Edit profile fills the circle, else the initial (identity.ts) */}
					<div
						className="flex size-[72px] shrink-0 items-center justify-center overflow-clip rounded-[36px] bg-[#242b3d]"
						style={{ boxShadow: outsideHairline(2, "#66b7da") }}
					>
						{me.photo ? (
							<img alt="" src={me.photo} width={72} height={72} draggable={false} className="size-full object-cover" />
						) : (
							<span className="h-[31px] whitespace-nowrap font-sora text-[24.75px] font-semibold leading-[31px] text-[#9eadc7]" style={HUG}>
								{me.initial}
							</span>
						)}
					</div>
					{/* below 1024: the text and Edit profile share a wrapping line; the text's basis is its own width, so Edit
					    profile wraps (16 under it, the row's own gap) exactly when the two no longer fit side by side */}
					<div className="contents max-lg:flex max-lg:min-w-0 max-lg:flex-1 max-lg:flex-wrap max-lg:items-center max-lg:gap-[16px]">
						{/* the text boxes keep Figma's 28 / 17 heights, so the scaled-down canvas (laptops under 1440) cannot round them taller */}
						<div className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip whitespace-nowrap max-lg:min-w-0 max-lg:basis-auto max-lg:whitespace-normal">
							<span className="h-[28px] font-sora text-[22px] font-semibold leading-[28px] text-white max-lg:h-auto max-lg:max-w-full max-lg:break-words">{me.name}</span>
							<span className="h-[17px] font-geist text-[13px] leading-[17px] text-[#819abb] max-lg:h-auto max-lg:max-w-full max-lg:text-balance max-lg:break-words">{`${me.handle} · Paper investor since ${investorSince(live.createdAt)}`}</span>
						</div>
						{/* "Edit profile" 2:2513: hugs its label, 9 / 14 padding, 1px inside stroke white 14%, fill white 6%, r10. A plain
						    frame in Figma (no variant, no hover or pressed state): cursor and focus ring only (SPEC section 5). */}
						<Link
							to="/profile/edit"
							className={`flex shrink-0 cursor-pointer items-start overflow-clip rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] px-[14px] py-[9px] ${EDIT_STROKE_BIG}`}
						>
							<span className="whitespace-nowrap font-geist text-[13px] font-medium leading-[17px] text-white" style={HUG}>
								{profile.edit}
							</span>
						</Link>
					</div>
				</div>

				<SectionLabel>{profile.yourStak.label}</SectionLabel>
				<SettingsCard>
					{yourStak.map((row) => (
						<SettingsRow
							key={row.label}
							href={row.href}
							name={rowName(row.label, row.value)}
							left={<RowLabel>{row.label}</RowLabel>}
							right={<RowValue>{row.value}</RowValue>}
						/>
					))}
				</SettingsCard>

				<SectionLabel>{profile.account.label}</SectionLabel>
				<SettingsCard>
					{ACCOUNT_ROWS.map((row, i) => (
						<SettingsRow
							key={row.href}
							href={row.href}
							external={row.external}
							name={rowName(profile.account.rows[i] ?? "")}
							left={<IconLabel icon={row.icon}>{profile.account.rows[i] ?? ""}</IconLabel>}
							right={<RowValue>{CHEVRON}</RowValue>}
						/>
					))}
				</SettingsCard>

				<GhostRowButton onClick={handleLogout}>{profile.logOut}</GhostRowButton>
				{/* "Delete account" 2:2554: a plain text layer in Figma (no variant, no hover or pressed state), so it carries no
				    press look; cursor and focus ring stay. Its label sits in an inline span of the (block) button, where Chrome
				    places the glyphs as the approved captures have them. */}
				<button
					type="button"
					aria-haspopup="dialog"
					onClick={() => setConfirmDelete(true)}
					className="w-full cursor-pointer rounded-[4px] text-center font-geist text-[13px] font-medium leading-[17px] text-[#e5484d] opacity-85"
				>
					<span>{profile.deleteAccount}</span>
				</button>
			</div>

			{/*
			 * Deleting an account cannot be undone, so it is confirmed first. Figma draws no frame for this step, so the sheet
			 * is the file's own confirmation sheet, value for value (2:1973 et al.): the 480 sheet with its handle, the Sora
			 * SemiBold 18 title, the Geist 12/18 #c8d2e0 body, then the canon primary button over the 51px "Back" row
			 * (r5.781, Sora 14.453), 16 apart. Back takes the initial focus, so a repeated Enter cannot delete.
			 */}
			{confirmDelete && (
				<Sheet label="Delete your account?" role="alertdialog" labelledBy={deleteTitleId} describedBy={deleteBodyId} onClose={() => setConfirmDelete(false)}>
					<p id={deleteTitleId} className="whitespace-nowrap font-sora text-[18px] font-semibold leading-[23px] text-white">
						Delete your account?
					</p>
					<p id={deleteBodyId} className="w-full font-geist text-[12px] leading-[18px] text-[#c8d2e0] max-lg:text-pretty">
						{user
							? "This removes your saves, your paper portfolio and your taste profile for good. There is no undo."
							: "This resets the demo profile: saves, paper trades and taste go back to the start."}
					</p>
					<div className="flex w-full flex-col items-start gap-[16px]">
						<PrimaryButton onClick={confirmDeletion} disabled={deleting} aria-busy={deleting}>
							{deleting ? "Deleting…" : profile.deleteAccount}
						</PrimaryButton>
						<GhostButton onClick={() => setConfirmDelete(false)} autoFocus>
							Back
						</GhostButton>
					</div>
				</Sheet>
			)}
		</div>
	);
}
