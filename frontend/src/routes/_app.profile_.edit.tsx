import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { authErrorMessage } from "@/app/auth/ui";
import { col } from "@/app/FitCanvas";
import { useLive } from "@/app/live/store";
import { PageHeader } from "@/app/PageHeader";
import { editProfile } from "@/app/profile/data";
import { cleanHandleInput, derivedHandle, downscalePhoto, handleToStore, useIdentity, useSaveProfileExtras } from "@/app/profile/identity";
import { useNotificationsPanel } from "@/app/profile/notifications";
import { HUG, RowLabel, RowValue, rowName, SectionLabel, SettingsCard, SettingsRow } from "@/app/profile/ui";
import { PrimaryButton } from "@/app/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile_/edit")({
	component: EditProfilePage,
});

const NAME_MAX = 24;

/** The value inside a field's frame: Geist 13/17 white at 16 / 16 (2:2593), on the frame's fill. */
const inputClass = "block size-full rounded-[14px] border-0 bg-transparent px-[16px] py-0 font-geist text-[13px] leading-[17px] text-white outline-none";

/**
 * A field (Figma 2:2590 et al.): the Geist Medium 11 #819abb label, 6 above the "Input" frame (640x49, #181f30, r14).
 * The fill belongs to the frame, as in Figma, and the input itself is transparent: over its own opaque fill Chrome draws
 * the value with coloured (LCD) edges once the canvas is scaled (1280x800: 341 coloured pixels in "hamza@gmail.com"),
 * over a transparent input it stays grayscale like Figma's (0). The frames clip in Figma but hold nothing that
 * overflows, so they do not clip here: the input's focus ring shows whole.
 * `grows`: below 1024 the frame is at least Figma's 49 and otherwise as tall as its value (see ReadOnlyValue).
 */
function Field({ label, children, grows }: { label: string; children: ReactNode; grows?: boolean }) {
	return (
		<label className="flex w-full flex-col items-start gap-[6px]">
			<span className="whitespace-nowrap font-geist text-[11px] font-medium leading-[14px] text-[#819abb]">{label}</span>
			<span className={cn("block h-[49px] w-full rounded-[14px] bg-[#181f30]", grows && "max-lg:relative max-lg:h-auto max-lg:min-h-[49px]")}>{children}</span>
		</label>
	);
}

/**
 * A read-only value that is the account's own and can be any length (the EMAIL, 2:2601 in the 640 x 49 "Input" 2:2600).
 * From 1024 up it is the approved read-only input. A field holds one line, and below 1024 the column can be narrower
 * than the address (SPEC R7: never cut unless Figma ellipsises it, and Figma does not: a 45-character address needs 333
 * px in the 256 px a 320 window leaves inside the field, and tabIndex -1 keeps a keyboard from scrolling it into view).
 * There the input stays the field's control for assistive tech (the label still names it "EMAIL", read-only, with the
 * whole address) but is drawn by nothing (sr-only), and the same value is drawn as wrapping text in its place: one line
 * is Figma's 49 (16 + the 17 line + 16, where the input centres it), a longer address takes a second line in the field
 * (breaking where it may, after a hyphen, else anywhere), the field growing 17 per line.
 */
function ReadOnlyValue({ value, autoComplete }: { value: string; autoComplete?: string }) {
	return (
		<>
			<input value={value} readOnly aria-readonly="true" tabIndex={-1} autoComplete={autoComplete} className={cn(inputClass, "max-lg:sr-only")} />
			<span aria-hidden="true" className="hidden px-[16px] py-[16px] font-geist text-[13px] leading-[17px] text-white wrap-anywhere max-lg:block">
				{value}
			</span>
		</>
	);
}

/**
 * Figma 2:2555 "Desktop · Edit profile": the display name, the handle and the photo are the person's to change, as on
 * both phones (android ui/profile/EditProfileScreen.kt:66-170, ios Profile/EditProfileView.swift); the email stays (a
 * verified address change needs sign-in work the website does not take on: the plan's D10).
 *
 * - The photo: the avatar (2:2587) and its hint (2:2589) both open the system's image picker (images only), as the phones'
 *   avatar and hint do (EditProfileScreen.kt:114-143); the picked image is centre-cropped and downscaled (identity.ts)
 *   and shows in the 64 px avatar at once. Save changes keeps it; leaving without saving drops it.
 * - The handle (2:2596): typed like the display name, no spaces, one "@", at most 21 characters, counted once the
 *   whitespace is gone, as the phone filters first and takes 21 then (EditProfileScreen.kt:146): cleanHandleInput's
 *   cap, not a maxLength on the raw value, which counted the spaces and cut a handle typed or pasted with them short.
 *   Until the person types in it, it follows the display name as before; blank, it falls back to that default.
 *   It shows on the hub's line (2:2512) and the rail's account line.
 * Both are kept in this browser (identity.ts); the display name goes to the account as before.
 *
 * Wiring: the frame carries no reactions and the phone's Edit (1:5782) wires only Back, so each control goes where its
 * label says. "Reset password · Email me a link" emails the link and shows Figma's 2:1566 "Check your email" ("We sent a
 * reset link to hamza@gmail.com", the address in the EMAIL field). Save changes (and Enter in a field) saves and returns
 * to the Profile hub. The bell opens the notifications panel (2:2611) in place.
 */
function EditProfilePage() {
	const me = useIdentity();
	const live = useLive();
	const { user, resetPassword } = useAuth();
	const navigate = useNavigate();
	const notifications = useNotificationsPanel();
	const saveExtras = useSaveProfileExtras();
	const [name, setName] = useState(me.name);
	// the handle the person typed; null while untouched, when the field shows the saved handle or the name's default
	const [typedHandle, setTypedHandle] = useState<string | null>(null);
	// the photo picked on this visit (undefined: none picked, the saved one shows)
	const [pickedPhoto, setPickedPhoto] = useState<string | undefined>(undefined);
	const [saving, setSaving] = useState(false);
	const [sendingReset, setSendingReset] = useState(false);
	const photoInput = useRef<HTMLInputElement>(null);
	const photoInputId = useId();
	useEffect(() => setName(me.name), [me.name]);

	const first = name.trim().split(/\s+/)[0] ?? "";
	const handle = typedHandle ?? (me.customHandle || derivedHandle(name));
	const initial = (first.charAt(0) || me.initial).toUpperCase();
	const photo = pickedPhoto ?? me.photo;
	const nameChanged = name.trim().length > 0 && name.trim() !== me.name;
	const storedHandle = handleToStore(handle, name.trim() || me.name);
	const handleChanged = typedHandle !== null && storedHandle !== me.customHandle;
	const photoChanged = pickedPhoto !== undefined && pickedPhoto !== me.photo;

	async function choosePhoto(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = ""; // the same file picked again still arrives
		if (!file) return;
		try {
			setPickedPhoto(await downscalePhoto(file));
		} catch {
			toast.error("That file is not an image STAK can read. Try another photo.");
		}
	}

	// the Profile hub showing the new name, handle and photo is the confirmation (Figma draws no toast for this flow)
	async function save() {
		if (saving) return;
		if (!nameChanged && !handleChanged && !photoChanged) {
			navigate({ to: "/profile" });
			return;
		}
		setSaving(true);
		try {
			if (nameChanged) await live.actions.setDisplayName(name);
			if (handleChanged || photoChanged) saveExtras({ ...(handleChanged ? { handle: storedHandle } : {}), ...(photoChanged ? { photo: pickedPhoto ?? null } : {}) });
			navigate({ to: "/profile" });
		} catch {
			toast.error("Could not save your changes. Try again.");
		} finally {
			setSaving(false);
		}
	}

	/**
	 * "Email me a link": the account's reset email goes out through the existing reset (AuthContext.resetPassword, as on
	 * Forgot password), then Check your email names the address, with the auth flow's forward push. `from=profile` asks
	 * that page's Back to return here (see the report's shared-file request). The signed-out persona has no account to
	 * email: it is shown the frame itself (the page's own demo address, nothing sent, Resend inert).
	 */
	async function emailResetLink() {
		if (sendingReset) return;
		const email = user?.email;
		if (!user) {
			navigate({ href: "/check-email?from=profile", viewTransition: false });
			return;
		}
		if (!email) {
			navigate({ to: "/forgot-password", viewTransition: false });
			return;
		}
		setSendingReset(true);
		try {
			await resetPassword(email);
			navigate({ href: `/check-email?email=${encodeURIComponent(email)}&from=profile`, viewTransition: false });
		} catch (err) {
			toast.error(authErrorMessage(err, "Could not send the reset email. Try again."));
		} finally {
			setSendingReset(false);
		}
	}

	return (
		<div className="relative flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={editProfile.title} onBell={notifications.toggle} />
			{notifications.panel}
			<form
				className="flex flex-col items-start gap-[16px]"
				style={{ width: col(640) }}
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				{/* avatar block 2:2586: the 64px avatar (#242b3d, r32, no stroke) over its hint, 8 apart, centred in the column.
				    Nothing in it overflows, so it does not clip: the avatar's focus ring shows whole. The avatar is a plain frame
				    in Figma (no variant, no hover or pressed state): cursor and focus ring only (SPEC section 5). The avatar opens
				    the image picker; the hint is that picker's label, so a click on it opens the picker too, while the keyboard
				    has the one control (the avatar). The picker itself is hidden: the system's file dialog is what shows. */}
				<div className="flex w-full flex-col items-center gap-[8px]">
					<input ref={photoInput} id={photoInputId} type="file" accept="image/*" hidden onChange={choosePhoto} />
					<button
						type="button"
						aria-label="Change photo"
						onClick={() => photoInput.current?.click()}
						className="flex size-[64px] cursor-pointer items-center justify-center overflow-clip rounded-[32px] bg-[#242b3d]"
					>
						{photo ? (
							<img alt="" src={photo} width={64} height={64} draggable={false} className="size-full object-cover" />
						) : (
							<span className="h-[28px] whitespace-nowrap font-sora text-[22px] font-semibold leading-[28px] text-[#9eadc7]" style={HUG}>
								{initial}
							</span>
						)}
					</button>
					<label htmlFor={photoInputId} className="block cursor-pointer whitespace-nowrap font-geist text-[12px] leading-[16px] text-[#819abb]" style={HUG}>
						{editProfile.avatarHint}
					</label>
				</div>

				<Field label={editProfile.fields[0].label}>
					<input
						value={name}
						maxLength={NAME_MAX}
						autoComplete="name"
						enterKeyHint="done"
						onChange={(e) => setName(e.target.value)}
						className={inputClass}
					/>
				</Field>
				{/* the handle (2:2596 / 2:2597): the frame's field, now typed in like the display name. No maxLength: the 21-character
				    cap is cleanHandleInput's, on what is kept once the whitespace is removed (a maxLength counted the spaces too) */}
				<Field label={editProfile.fields[1].label}>
					<input
						value={handle}
						placeholder={derivedHandle(name.trim() || me.name)}
						autoComplete="off"
						autoCapitalize="none"
						spellCheck={false}
						enterKeyHint="done"
						onChange={(e) => setTypedHandle(cleanHandleInput(e.target.value))}
						className={cn(inputClass, "placeholder:text-[#819abb]")}
					/>
				</Field>
				<Field label={editProfile.fields[2].label} grows>
					<ReadOnlyValue value={me.email} autoComplete="email" />
				</Field>

				<SectionLabel>{editProfile.security.label}</SectionLabel>
				<SettingsCard>
					<SettingsRow
						onClick={emailResetLink}
						popup={{ "aria-busy": sendingReset }}
						name={rowName(editProfile.security.row.label, editProfile.security.row.value)}
						left={<RowLabel>{editProfile.security.row.label}</RowLabel>}
						right={<RowValue>{editProfile.security.row.value}</RowValue>}
					/>
				</SettingsCard>
				{/* one line at 1024+; below, it wraps without leaving a word alone on its last line (text-wrap: pretty) */}
				<p className="w-full font-geist text-[12px] leading-[16px] text-[#819abb] max-lg:text-pretty">{editProfile.note}</p>

				{/* "CTA" 2:2608 clips the button's glow at its bottom edge (y 787 in the frame). While the button has keyboard focus
				    the sides stop clipping, so its focus ring shows whole; the top and bottom keep 8 / 26 of room for it. */}
				<div className="flex w-full flex-col items-center overflow-clip pb-[26px] pt-[8px] has-[:focus-visible]:overflow-x-visible">
					<PrimaryButton type="submit" disabled={saving} aria-busy={saving}>
						{saving ? "Saving…" : editProfile.save}
					</PrimaryButton>
				</div>
			</form>
		</div>
	);
}
