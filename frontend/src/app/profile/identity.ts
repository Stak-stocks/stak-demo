/**
 * The person's handle and photo as Edit profile sets them (Figma 2:2555: HANDLE 2:2596, the avatar 2:2587 with "Tap the
 * avatar to change your photo" 2:2589), kept in this browser per account (the guest persona has its own key), as both
 * phones keep them on the device: android ui/UserProfile.kt:14-16 (photoUri, handle) and ui/profile/EditProfileScreen.kt
 * :145-163, ios UserProfile.swift + Profile/EditProfileView.swift:38-62 / 118-127.
 *
 * - The handle: no spaces, one leading "@", at most HANDLE_MAX characters with it (android EditProfileScreen.kt:146:
 *   whitespace filtered, NAME_MAX + 1). Stored blank while it is the default the display name gives (the web's own rule,
 *   useAccountDisplay.ts: "@" + the first name in lower case), so a renamed person's default handle follows the name, as
 *   the phones store "the authored defaults stay derived" (EditProfileScreen.kt:158-160).
 * - The photo: an image the person picked, centre-cropped to a square and downscaled to PHOTO_MAX px (the phones
 *   subsample to about 512: project notes 2026-08-21, android onboarding/ProfileSetupScreen copyAvatar), kept as a JPEG
 *   data URL. With none, every avatar shows the initial, as before.
 *
 * `useIdentity()` is `useAccountDisplay()` with both applied: the hub's line (2:2512) and the rail's account line read
 * the handle, the hub's 72 px avatar (2:2508), Edit profile's 64 px one and the rail's 28 px one read the photo.
 */
import { useCallback } from "react";
import { monthYearNow } from "@/app/live/clock";
import { monthYear } from "@/app/live/format";
import { storeFor, useStore } from "@/app/live/guest";
import { useLive } from "@/app/live/store";
import { type AccountDisplay, useAccountDisplay } from "@/app/useAccountDisplay";

export type ProfileExtras = {
	/** "@name", or "" for the default the display name gives */
	handle: string;
	/** a data URL (image/jpeg, at most PHOTO_MAX square), or null for the initial */
	photo: string | null;
};

/** "@" and 20 more: the phones' NAME_MAX + 1 (android EditProfileScreen.kt:57 / 146). */
export const HANDLE_MAX = 21;
/** The photo's side in px (the phones' ~512 subsample). */
export const PHOTO_MAX = 512;

export const extrasKey = (uid: string | null) => `stak.profile.${uid ?? "guest"}.v1`;
const seed = (): ProfileExtras => ({ handle: "", photo: null });

export const extrasStore = (uid: string | null) => storeFor<ProfileExtras>(extrasKey(uid), seed);

/** The current person's handle and photo. */
export function useProfileExtras(): ProfileExtras {
	return useStore(extrasStore(useLive().uid));
}

/** Writes the current person's handle and / or photo (Edit profile's Save changes). */
export function useSaveProfileExtras(): (patch: Partial<ProfileExtras>) => void {
	const uid = useLive().uid;
	return useCallback((patch: Partial<ProfileExtras>) => extrasStore(uid).update(patch), [uid]);
}

/** Back to no handle and no photo (the guest persona's Delete account starts the demo over; Log out erases nothing). */
export const resetProfileExtras = (uid: string | null) => extrasStore(uid).reset();

/** The handle a display name gives (useAccountDisplay.ts's rule): "@" + its first word in lower case, letters, digits and _ only. */
export function derivedHandle(name: string): string {
	const first = name.trim().split(/\s+/)[0] ?? "";
	return `@${first.toLowerCase().replace(/[^a-z0-9_]/g, "") || "you"}`;
}

/** What the HANDLE field keeps of a keystroke: no whitespace, at most one leading "@", HANDLE_MAX characters with it. */
export function cleanHandleInput(value: string): string {
	const bare = value.replace(/\s+/g, "");
	const at = bare.startsWith("@");
	const body = bare.replace(/^@+/, "").slice(0, HANDLE_MAX - 1);
	return at ? `@${body}` : body;
}

/** The handle Save changes stores: "" for a blank field, a lone "@" or the name's own default; else "@" + what was typed. */
export function handleToStore(value: string, name: string): string {
	const body = cleanHandleInput(value).replace(/^@/, "");
	if (!body) return "";
	const handle = `@${body}`;
	return handle === derivedHandle(name) ? "" : handle;
}

/**
 * "Paper investor since <month>" (the hub's line, 2:2512): the month the account was created in, for every visitor (the
 * hunt's NUM-07 / NUM-15, coordinator rulings N23d, N23s and N30.3b). The persona's is the seed's own (live/guest.ts
 * seedGuest createdAt: 2026 history, absolute like its picks and saves); an account's is its creation day; an account
 * that carries none started now, so it reads the clock's month (the phones' rule for a new account: android
 * ui/Session.kt:126 `StakClock.monthYear()`, ios Session.swift:118), where the page printed the frame's literal "July
 * 2026". The untouched showcase still reads the frame's month: live/store.ts hands it the frames' creation day.
 */
export const investorSince = (createdAt: number | null | undefined, now = Date.now()): string => (createdAt ? monthYear(createdAt) : monthYearNow(now));

/** The account's display values with the handle and the photo of Edit profile applied. */
export type Identity = AccountDisplay & {
	/** the photo (a data URL) or null: draw the initial */
	photo: string | null;
	/** the handle the person chose, "" while it is the name's default */
	customHandle: string;
};

export function useIdentity(): Identity {
	const base = useAccountDisplay();
	const { handle, photo } = useProfileExtras();
	if (!handle) return { ...base, photo, customHandle: "" };
	// the rail's second line shows the chosen handle in place of the frames' "@" + email (2:7369)
	return { ...base, handle, sidebarLine: handle, photo, customHandle: handle };
}

/**
 * Reads an image file into the avatar's photo: centre-cropped to a square, downscaled to at most `max` px, drawn on
 * the avatar's own #242b3d (a transparent image keeps the avatar's fill), encoded as a JPEG data URL. Rejects a file
 * the browser cannot decode as an image.
 */
export async function downscalePhoto(file: Blob, max = PHOTO_MAX): Promise<string> {
	if (!file.type.startsWith("image/")) throw new Error("not an image");
	const source = await decode(file);
	try {
		const w = source.width;
		const h = source.height;
		if (!(w > 0 && h > 0)) throw new Error("empty image");
		const side = Math.min(w, h);
		const out = Math.max(1, Math.min(max, Math.round(side)));
		const canvas = document.createElement("canvas");
		canvas.width = out;
		canvas.height = out;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("no canvas");
		ctx.fillStyle = "#242b3d";
		ctx.fillRect(0, 0, out, out);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
		ctx.drawImage(source.image, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
		return canvas.toDataURL("image/jpeg", 0.86);
	} finally {
		source.release();
	}
}

type Decoded = { image: CanvasImageSource; width: number; height: number; release: () => void };

/** The image as something a canvas can draw: an ImageBitmap (EXIF orientation applied), else an <img> from an object URL. */
async function decode(file: Blob): Promise<Decoded> {
	if (typeof createImageBitmap === "function") {
		try {
			const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
			return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
		} catch {
			/* a format the bitmap decoder does not take (some SVGs): try an <img> */
		}
	}
	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.decoding = "async";
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error("not an image"));
			img.src = url;
		});
		return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
	} catch (error) {
		URL.revokeObjectURL(url);
		throw error;
	}
}
