import { useCallback, useEffect, useRef, useState } from "react";
import type { StoryClip } from "./media";

/**
 * Where the article hero's player reads its clip (src/routes/_app.news_.$id.tsx, Hero).
 *
 * A clip the browser can stream is its own URL: the <video> asks for it when the play mark is pressed. A clip whose
 * host refuses the page's referrer (StoryClip.noReferrer: video.twimg.com) cannot be streamed, because a media element
 * cannot drop its referrer: it is fetched without one into memory and played from there (a blob URL), 3-7 MB that must
 * be in before the first frame. So WHEN that fetch starts decides how long the person waits after the press (the review
 * of 2026-11-09 measured 5-12 s from the press on this connection):
 * - both phones start buffering the moment the article opens (android ui/news/NewsDetailScreen.kt:1473-1477 "cinema-fast:
 *   buffering from the moment the article opens", rememberHeroPlayer -> NewsVideoCache.preparedPlayer; iOS
 *   StakDemo/News/NewsDetailView.swift:289 `.onAppear { prebuffer() }`, :425-431). The website does the same for these
 *   clips, once the hero's poster is in (the clip never competes with the picture the person is looking at) or at once
 *   when the pointer or the keyboard reaches the play mark, so a press usually finds the clip already in memory and
 *   plays inside the press itself;
 * - not when the browser says the person asked to save data, or reports a slow link (`prefetchAllowed`): there nothing
 *   is fetched before the press, and giving the wait up stops the fetch.
 * The clip stays in memory while the article is open (a replay starts at once) and is released when the page goes.
 */

/** A fetched clip counts as getting closer to its first frame each time this much more of it has arrived. */
export const CLIP_STEP_BYTES = 512 * 1024;

/** What the Network Information API says of the link (Chromium; other browsers have no `navigator.connection`). */
export type LinkHints = { readonly connection?: { readonly saveData?: boolean; readonly effectiveType?: string } };

/**
 * Whether the page may fetch a clip before the person asks for it: not under the browser's data saver, and not on a
 * link the browser rates below "4g" (Network Information API; a browser without it gives no reason to hold back, as the
 * phone apps buffer on any link).
 */
export function prefetchAllowed(hints: LinkHints | undefined = typeof navigator === "undefined" ? undefined : (navigator as unknown as LinkHints)): boolean {
	const c = hints?.connection;
	if (!c) return true;
	if (c.saveData === true) return false;
	return c.effectiveType === undefined || c.effectiveType === "4g";
}

/**
 * Reads a fetched clip into a Blob of its own type, reporting `onStep` each time another CLIP_STEP_BYTES have arrived
 * and once more when it is whole (the hero's stall clock runs on these: a trickle that brings less in its 15 s is a
 * stall). A response without a readable body is read in one piece.
 */
export async function readClip(response: Response, onStep: () => void): Promise<Blob> {
	if (!response.ok) throw new Error(`clip ${response.status}`);
	const type = response.headers.get("content-type") ?? "video/mp4";
	const reader = response.body?.getReader();
	if (!reader) {
		const whole = await response.blob();
		onStep();
		return whole;
	}
	const parts: BlobPart[] = [];
	let got = 0;
	let reported = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		parts.push(value as BlobPart);
		got += value.byteLength;
		if (got - reported >= CLIP_STEP_BYTES) {
			reported = got;
			onStep();
		}
	}
	onStep();
	return new Blob(parts, { type });
}

export type ClipSource = {
	/** what the player reads: the clip's own URL, the fetched clip's blob URL, or null (no clip, or not in memory yet) */
	readonly url: string | null;
	/** start fetching a clip that must be fetched (nothing for a streamed clip, a fetch under way or a clip in memory) */
	readonly request: () => void;
	/** drop a fetch under way (a stalled connection, a wait given up under the data saver); a clip in memory stays */
	readonly cancel: () => void;
};

/**
 * The hero's clip source. `onStep` reports a fetched clip getting closer (readClip); `onFail` a fetch that failed (the
 * hero returns to its rest if the person was waiting for it; a failed fetch nobody waited for is silent, and the next
 * press tries again).
 */
export function useClipSource(clip: StoryClip | null, onStep: () => void, onFail: () => void): ClipSource {
	const [blob, setBlob] = useState<string | null>(null);
	const fetching = useRef<AbortController | null>(null);
	const held = useRef<string | null>(null);
	const report = useRef({ onStep, onFail });
	useEffect(() => {
		report.current = { onStep, onFail };
	});
	const fetched = clip?.noReferrer === true;
	const address = clip?.url ?? null;
	const request = useCallback(() => {
		if (!fetched || !address || fetching.current || held.current) return;
		const ctrl = new AbortController();
		fetching.current = ctrl;
		fetch(address, { referrerPolicy: "no-referrer", signal: ctrl.signal })
			.then((r) => readClip(r, () => report.current.onStep()))
			.then((whole) => {
				if (ctrl.signal.aborted) return;
				fetching.current = null;
				held.current = URL.createObjectURL(whole);
				setBlob(held.current);
			})
			.catch(() => {
				if (ctrl.signal.aborted) return;
				fetching.current = null;
				report.current.onFail();
			});
	}, [fetched, address]);
	const cancel = useCallback(() => {
		fetching.current?.abort();
		fetching.current = null;
	}, []);
	// the page goes (or shows another clip): the fetch stops and the clip in memory is released
	useEffect(
		() => () => {
			fetching.current?.abort();
			fetching.current = null;
			if (held.current) URL.revokeObjectURL(held.current);
			held.current = null;
			setBlob(null);
		},
		[address],
	);
	return { url: !clip ? null : fetched ? blob : clip.url, request, cancel };
}
