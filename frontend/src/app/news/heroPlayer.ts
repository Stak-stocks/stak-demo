import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * How long the hero waits for a clip that is getting no closer to its first frame before it gives the wait up (the
 * review of 2026-11-09: on a stalled connection the hero stayed busy for as long as the page was open). The phones
 * return a stream that fails to the poster and the glyph (android ui/news/NewsDetailScreen.kt:1509-1512 onPlayerError,
 * after ExoPlayer's own read timeouts; iOS StakDemo/News/NewsDetailView.swift:1037 `.failed`); a browser reports no
 * such failure for a connection that merely stops delivering, so the hero keeps the clock itself.
 */
export const STALL_MS = 15_000;

/**
 * A second press this soon after the first is the other half of a double click, not a change of mind (Windows' own
 * double-click time is 500 ms): it leaves the wait alone.
 */
export const DOUBLE_PRESS_MS = 600;

/** HTMLMediaElement.HAVE_CURRENT_DATA: the frame at the playback position is decoded. */
const HAVE_CURRENT_DATA = 2;

/**
 * What `watchFirstFrame` needs of a player; an HTMLVideoElement is one. `requestVideoFrameCallback` where the browser
 * has it (Chrome, Safari, Firefox 132+); `ontimeupdate` is how a media element says it fires `timeupdate` at all.
 */
export type FramePlayer = {
	readonly currentTime: number;
	readonly readyState: number;
	readonly ontimeupdate?: unknown;
	addEventListener(type: "timeupdate" | "loadeddata", listener: () => void): void;
	removeEventListener(type: "timeupdate" | "loadeddata", listener: () => void): void;
	requestVideoFrameCallback?: (callback: (now: number, frame: { readonly mediaTime: number }) => void) => number;
	cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Reports, once, the moment a player's PICTURE is on: the first frame it shows past the clip's lead-in. Until then the
 * hero keeps its poster (useHeroPlayer: `markReady` is this report).
 *
 * The frame a player decodes first (`loadeddata`) is not always a picture. The two CNBC clips open on black and fade
 * their newscast in over 0.6 s, and a player that has its first frame may still take a while to start (1.5 to 2.4 s in
 * headless Chrome, whose sound starts late), so the hero went poster, black player, picture (the review of 2026-11-09;
 * measured frame by frame, src/app/news/media.ts StoryClip.leadIn). So the report waits for a frame that has MOVED: one
 * whose media time is past zero and has reached the clip's `leadIn` (0 for a clip that opens on its picture, which
 * therefore shows the moment it moves).
 * - `requestVideoFrameCallback` names the media time of each frame the player presents: the exact signal, where the
 *   browser has it (Chrome runs it for the hero's hidden player too);
 * - `timeupdate` (about four a second, and one as playback begins) with the playback position is the same test at a
 *   coarser step: the signal of a browser without frame callbacks, and a second witness beside them (whichever comes
 *   first reports, once);
 * - a player with neither falls back to `loadeddata`, the first decoded frame, as before.
 * A player already past the lead-in when the watch starts (a source the browser was playing) reports at once.
 * The hero's stall clock is not this function's: it keeps running until the report, so a clip that decodes its first
 * frame and then gets no further still returns the hero to its rest (useHeroPlayer STALL_MS).
 * Returns the function that ends the watch (the player goes, or the browser refused to start it and shows it anyway).
 */
export function watchFirstFrame(player: FramePlayer, onFrame: () => void, leadIn = 0): () => void {
	const wait = Number.isFinite(leadIn) && leadIn > 0 ? leadIn : 0;
	const past = (mediaTime: number) => mediaTime > 0 && mediaTime >= wait;
	const frames = typeof player.requestVideoFrameCallback === "function";
	const times = "ontimeupdate" in player;
	let watching = true;
	let handle: number | null = null;
	const stop = () => {
		if (!watching) return;
		watching = false;
		player.removeEventListener("timeupdate", onTime);
		player.removeEventListener("loadeddata", report);
		if (handle !== null) player.cancelVideoFrameCallback?.(handle);
		handle = null;
	};
	function report() {
		if (!watching) return;
		stop();
		onFrame();
	}
	function onTime() {
		if (past(player.currentTime)) report();
	}
	function onPresented(_now: number, frame: { readonly mediaTime: number }) {
		handle = null;
		if (!watching) return;
		if (past(frame.mediaTime)) report();
		else handle = player.requestVideoFrameCallback?.(onPresented) ?? null;
	}
	const decoded = player.readyState >= HAVE_CURRENT_DATA;
	if (decoded && (past(player.currentTime) || (!frames && !times))) {
		report();
		return stop;
	}
	if (frames) handle = player.requestVideoFrameCallback?.(onPresented) ?? null;
	if (times) player.addEventListener("timeupdate", onTime);
	if (!frames && !times) player.addEventListener("loadeddata", report);
	return stop;
}

/**
 * The article hero's player state (the media slot of src/routes/_app.news_.$id.tsx, Hero): `playing` from the play
 * mark's press until the clip ends, fails, stalls, is given up or the page goes; `ready` once the player has painted its
 * FIRST FRAME past the clip's lead-in (`watchFirstFrame` above: a frame that has moved, so neither an empty player nor a
 * clip's own black opening ever covers the poster). Until then the hero keeps its rest (the poster, the category tag,
 * the save control) with the play mark waiting, and the player, mounted hidden as soon as it has a source so the stream
 * starts, shows nothing: the phones hold the poster until the clip runs (android ui/news/NewsDetailScreen.kt:451-452
 * "Poster holds until onRenderedFirstFrame", set at :1508 by the ExoPlayer listener's onRenderedFirstFrame; iOS
 * StakDemo/News/NewsDetailView.swift:306-308 `firstFrame`, set when the player's status turns playing), so no empty
 * player ever covers it.
 *
 * The wait always has a way out (the review of 2026-11-09):
 * - `cancel`: the person gives it up, by a second press on the waiting mark (not a double click's: DOUBLE_PRESS_MS) or
 *   by Escape; the hero is at rest again at once;
 * - the stall clock: STALL_MS without the clip getting closer to its first frame (`progress`: another slice of a
 *   fetched clip's bytes, a stream's metadata, its first decoded frame, playback starting) returns the hero to its rest
 *   by itself and sets `failed`, as `fail` does for a fetch or a stream that reports its own failure. The clock runs
 *   until `markReady`: a clip that decodes its first frame and never plays past its lead-in is a stall too. `failed`
 *   lasts until the next press, for the hero's screen-reader status.
 *
 * The keyboard follows the control it was on: with the frame in, the hero belongs to the player and every rest control
 * in it leaves in the same commit, so the player takes the focus from any of them (the play mark it replaces, the save
 * control the person tabbed to during the wait: `heroRef` holds them all) or from nothing (a browser whose click leaves
 * buttons unfocused), never from a control outside the hero that the person moved to (Back, which stays). `stop`
 * returns the hero to its rest (both flags down) and, when the player had the keyboard focus, gives it to the play
 * mark (otherwise focus would fall to the page's top). A return to rest before the first frame (a cancel, a stall, a
 * failed stream) leaves the focus where it is: on the play mark, or on the control the person moved to.
 */
export type HeroPlayer = {
	/** the play mark was pressed and the clip has not ended, failed, stalled or been given up */
	readonly playing: boolean;
	/** the player has painted its first frame: the hero belongs to it */
	readonly ready: boolean;
	/** the last press ended without a frame (a stall, a failed fetch or stream); cleared by the next press */
	readonly failed: boolean;
	readonly start: () => void;
	/** the player reports its first frame (or that it needs the person's own press to start: it shows either way) */
	readonly markReady: () => void;
	/** the clip got closer to its first frame: the stall clock starts again */
	readonly progress: () => void;
	/**
	 * The person gives the wait up. A press is ignored within DOUBLE_PRESS_MS of the one that started the clip;
	 * `deliberate` (Escape) is never ignored. True when the wait ended.
	 */
	readonly cancel: (deliberate?: boolean) => boolean;
	/** the clip ended: back to rest */
	readonly stop: () => void;
	/** the clip failed while the person waited for it or watched it: back to rest, `failed` set */
	readonly fail: () => void;
	/** the hero: its rest controls leave when the player shows */
	readonly heroRef: RefObject<HTMLDivElement | null>;
	readonly playRef: RefObject<HTMLButtonElement | null>;
	readonly videoRef: RefObject<HTMLVideoElement | null>;
};

export function useHeroPlayer(stallMs: number = STALL_MS): HeroPlayer {
	const [playing, setPlaying] = useState(false);
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const heroRef = useRef<HTMLDivElement>(null);
	const playRef = useRef<HTMLButtonElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const refocus = useRef(false);
	const handOff = useRef(false);
	// the state as the callbacks need it between renders (a media event, a fetch and a timer may land in one task)
	const now = useRef({ playing: false, ready: false });
	const startedAt = useRef(0);
	const clock = useRef<number | null>(null);
	const disarm = useCallback(() => {
		if (clock.current === null) return;
		window.clearTimeout(clock.current);
		clock.current = null;
	}, []);
	const rest = useCallback(
		(didFail: boolean) => {
			disarm();
			const v = videoRef.current;
			refocus.current = !!v && (document.activeElement === v || v.contains(document.activeElement));
			now.current = { playing: false, ready: false };
			setPlaying(false);
			setReady(false);
			setFailed(didFail);
		},
		[disarm],
	);
	const arm = useCallback(() => {
		disarm();
		clock.current = window.setTimeout(() => {
			clock.current = null;
			rest(true);
		}, stallMs);
	}, [disarm, rest, stallMs]);
	const start = useCallback(() => {
		if (now.current.playing) return;
		now.current = { playing: true, ready: false };
		startedAt.current = Date.now();
		setPlaying(true);
		setReady(false);
		setFailed(false);
		arm();
	}, [arm]);
	const progress = useCallback(() => {
		if (now.current.playing && !now.current.ready) arm();
	}, [arm]);
	const markReady = useCallback(() => {
		// a report that lands after the hero went back to rest (a stream's last event, a refused play) shows nothing
		if (!now.current.playing || now.current.ready) return;
		disarm();
		now.current = { playing: true, ready: true };
		// read before the render that removes the rest controls: the focus is handed on from any of them (or from nothing)
		const active = document.activeElement;
		const hero = heroRef.current;
		handOff.current =
			!active || active === document.body || active === playRef.current || (!!hero && active !== videoRef.current && hero.contains(active));
		setReady(true);
	}, [disarm]);
	const cancel = useCallback(
		(deliberate = false) => {
			if (!now.current.playing || now.current.ready) return false;
			if (!deliberate && Date.now() - startedAt.current < DOUBLE_PRESS_MS) return false;
			rest(false);
			return true;
		},
		[rest],
	);
	const stop = useCallback(() => rest(false), [rest]);
	const fail = useCallback(() => {
		if (now.current.playing) rest(true);
	}, [rest]);
	// the page goes: no clock is left running
	useEffect(() => disarm, [disarm]);
	// the player shows (controls on, no longer inert) in the commit that removes the rest controls: it takes their focus
	useEffect(() => {
		if (!ready || !handOff.current) return;
		handOff.current = false;
		videoRef.current?.focus({ preventScroll: true });
	}, [ready]);
	// the play mark is back in the same commit that removes the player: give it the focus the player had
	useLayoutEffect(() => {
		if (playing || !refocus.current) return;
		refocus.current = false;
		playRef.current?.focus({ preventScroll: true });
	}, [playing]);
	return { playing, ready, failed, start, markReady, progress, cancel, stop, fail, heroRef, playRef, videoRef };
}
