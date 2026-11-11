import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOUBLE_PRESS_MS, type FramePlayer, STALL_MS, useHeroPlayer, watchFirstFrame } from "../heroPlayer";
import { CNBC_FADE_IN, STORY_CLIPS } from "../media";

/**
 * A player as watchFirstFrame meets one: its two events, its clock and, where the browser has them, its frame
 * callbacks (`frames`); `times: false` is a media element that fires no timeupdate at all (no `ontimeupdate`).
 */
function fakePlayer({ frames = true, times = true }: { frames?: boolean; times?: boolean } = {}) {
	const listeners = new Map<string, Set<() => void>>();
	const pending = new Map<number, (now: number, frame: { readonly mediaTime: number }) => void>();
	let handles = 0;
	const player: { currentTime: number; readyState: number } & Omit<FramePlayer, "currentTime" | "readyState"> = {
		currentTime: 0,
		readyState: 0,
		addEventListener: (type, listener) => {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type)?.add(listener);
		},
		removeEventListener: (type, listener) => {
			listeners.get(type)?.delete(listener);
		},
		...(times ? { ontimeupdate: null } : {}),
		...(frames
			? {
					requestVideoFrameCallback: (callback: (now: number, frame: { readonly mediaTime: number }) => void) => {
						handles += 1;
						pending.set(handles, callback);
						return handles;
					},
					cancelVideoFrameCallback: (handle: number) => {
						pending.delete(handle);
					},
				}
			: {}),
	};
	const fire = (type: string) => {
		for (const listener of [...(listeners.get(type) ?? [])]) listener();
	};
	return {
		player,
		fire,
		/** the first frame is decoded: readyState HAVE_ENOUGH_DATA, loadeddata */
		decode() {
			player.readyState = 4;
			fire("loadeddata");
		},
		/** the player presents the frame at this media time (its frame callbacks run, as the browser runs them: once each) */
		present(mediaTime: number) {
			player.currentTime = mediaTime;
			const due = [...pending.values()];
			pending.clear();
			for (const callback of due) callback(0, { mediaTime });
		},
		/** the playback position moves and the player says so */
		tick(currentTime: number) {
			player.currentTime = currentTime;
			fire("timeupdate");
		},
		listening: (type: string) => listeners.get(type)?.size ?? 0,
		waitingFrames: () => pending.size,
	};
}

/** The hero's two controls, as the route mounts them: the play mark at rest, the player while the clip runs. */
function mountControls() {
	const play = document.createElement("button");
	play.setAttribute("aria-label", "Play video");
	const video = document.createElement("video");
	video.tabIndex = 0;
	document.body.append(play, video);
	return { play, video };
}

/**
 * The hero as the route mounts it while a clip is on its way: its rest controls (the save control, the play mark) and
 * the player, hidden under them; Back sits outside it.
 */
function mountHero() {
	const hero = document.createElement("div");
	const save = document.createElement("button");
	save.setAttribute("aria-label", "Save NVIDIA Corp. to My STAK");
	const play = document.createElement("button");
	play.setAttribute("aria-label", "Play video");
	const video = document.createElement("video");
	video.tabIndex = 0;
	hero.append(video, save, play);
	const back = document.createElement("a");
	back.href = "/news";
	document.body.append(back, hero);
	return { hero, save, play, video, back };
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("the hero's player state (the poster holds until the first frame, as the phones' onRenderedFirstFrame)", () => {
	it("rests until the play mark is pressed, then plays without a frame until the player reports one", () => {
		const { result } = renderHook(() => useHeroPlayer());
		expect(result.current.playing).toBe(false);
		expect(result.current.ready).toBe(false);
		act(() => result.current.start());
		// playing, but no frame yet: the hero keeps its rest and the mark reads busy
		expect(result.current.playing).toBe(true);
		expect(result.current.ready).toBe(false);
		act(() => result.current.markReady());
		expect(result.current.playing).toBe(true);
		expect(result.current.ready).toBe(true);
	});

	it("a finished clip returns to rest (both flags down) and hands the player's keyboard focus to the play mark", () => {
		const { result } = renderHook(() => useHeroPlayer());
		const { play, video } = mountControls();
		result.current.playRef.current = play;
		result.current.videoRef.current = video;
		act(() => {
			result.current.start();
			result.current.markReady();
		});
		video.focus();
		expect(document.activeElement).toBe(video);
		act(() => result.current.stop());
		expect(result.current.playing).toBe(false);
		expect(result.current.ready).toBe(false);
		expect(result.current.failed).toBe(false);
		expect(document.activeElement).toBe(play);
		// the next press starts from no frame again
		act(() => result.current.start());
		expect(result.current.ready).toBe(false);
	});

	it("with the frame in, the player takes the focus from the play mark it replaces, or from nothing, never from a control the person moved to", () => {
		const { result } = renderHook(() => useHeroPlayer());
		const { play, video } = mountControls();
		result.current.playRef.current = play;
		result.current.videoRef.current = video;
		// the mark was pressed (a click focuses it): the player takes over
		play.focus();
		act(() => result.current.start());
		act(() => result.current.markReady());
		expect(document.activeElement).toBe(video);
		act(() => result.current.stop());
		// a browser whose click leaves the button unfocused: nothing has the focus, the player takes it
		(document.activeElement as HTMLElement | null)?.blur();
		expect(document.activeElement).toBe(document.body);
		act(() => result.current.start());
		act(() => result.current.markReady());
		expect(document.activeElement).toBe(video);
		act(() => result.current.stop());
		// the person tabbed on to another control during the wait: the focus stays there
		const back = document.createElement("a");
		back.href = "/news";
		document.body.append(back);
		act(() => result.current.start());
		back.focus();
		act(() => result.current.markReady());
		expect(result.current.ready).toBe(true);
		expect(document.activeElement).toBe(back);
	});

	it("takes the focus from ANY rest control of the hero, which the same commit removes (the save control the person tabbed to during the wait), and leaves a control outside the hero alone", () => {
		const { result } = renderHook(() => useHeroPlayer());
		const { hero, save, play, video, back } = mountHero();
		result.current.heroRef.current = hero as HTMLDivElement;
		result.current.playRef.current = play;
		result.current.videoRef.current = video;
		// Enter on the play mark, Shift+Tab to the save control during the wait (the review of 2026-11-09: the focus fell
		// to the page's body when the first frame removed that control, and the next Tab skipped the player)
		play.focus();
		act(() => result.current.start());
		save.focus();
		expect(document.activeElement).toBe(save);
		act(() => result.current.markReady());
		expect(document.activeElement).toBe(video);
		act(() => result.current.stop());
		// Back stays on the page: a focus the person moved there is not taken
		act(() => result.current.start());
		back.focus();
		act(() => result.current.markReady());
		expect(document.activeElement).toBe(back);
	});

	it("a stop while the focus is elsewhere moves nothing: the play mark had it (a stream that failed before its first frame), or the page", () => {
		const { result } = renderHook(() => useHeroPlayer());
		const { play, video } = mountControls();
		result.current.playRef.current = play;
		result.current.videoRef.current = video;
		act(() => result.current.start());
		play.focus();
		act(() => result.current.stop());
		expect(document.activeElement).toBe(play);
		const elsewhere = document.createElement("button");
		document.body.append(elsewhere);
		act(() => {
			result.current.start();
			result.current.markReady();
		});
		elsewhere.focus();
		act(() => result.current.stop());
		expect(document.activeElement).toBe(elsewhere);
	});

	it("shows nothing for a report that lands after the hero went back to rest (a stream's last event, a refused play)", () => {
		const { result } = renderHook(() => useHeroPlayer());
		act(() => result.current.markReady());
		expect(result.current.ready).toBe(false);
		act(() => result.current.start());
		act(() => result.current.stop());
		act(() => result.current.markReady());
		expect(result.current.playing).toBe(false);
		expect(result.current.ready).toBe(false);
		// and the next press still waits for its own first frame
		act(() => result.current.start());
		expect(result.current.ready).toBe(false);
	});
});

describe("the wait has a way out (the review of 2026-11-09: a stalled clip kept the hero busy for good)", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});
	const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

	it("returns to rest by itself, marked failed, when the clip gets no closer to its first frame for 15 s", () => {
		expect(STALL_MS).toBe(15_000);
		const { result } = renderHook(() => useHeroPlayer());
		act(() => result.current.start());
		advance(STALL_MS - 1);
		expect(result.current.playing).toBe(true);
		expect(result.current.failed).toBe(false);
		advance(1);
		expect(result.current.playing).toBe(false);
		expect(result.current.ready).toBe(false);
		expect(result.current.failed).toBe(true);
		// the next press clears the mark and waits afresh
		act(() => result.current.start());
		expect(result.current.failed).toBe(false);
		expect(result.current.playing).toBe(true);
	});

	it("each step closer (a slice of a fetched clip, a stream's metadata) starts the 15 s again; a clip that keeps coming is never dropped", () => {
		const { result } = renderHook(() => useHeroPlayer());
		act(() => result.current.start());
		for (let i = 0; i < 6; i++) {
			advance(STALL_MS - 1000);
			act(() => result.current.progress());
		}
		expect(result.current.playing).toBe(true);
		advance(STALL_MS - 1);
		expect(result.current.playing).toBe(true);
		advance(1);
		expect(result.current.playing).toBe(false);
		expect(result.current.failed).toBe(true);
	});

	it("the first frame ends the clock: a clip that plays is never called stalled, and progress after it changes nothing", () => {
		const { result } = renderHook(() => useHeroPlayer());
		act(() => result.current.start());
		advance(5000);
		act(() => result.current.markReady());
		act(() => result.current.progress());
		advance(STALL_MS * 4);
		expect(result.current.playing).toBe(true);
		expect(result.current.ready).toBe(true);
		expect(result.current.failed).toBe(false);
	});

	it("the person gives the wait up with a second press (not a double click's) or Escape: back to rest at once, not marked failed", () => {
		expect(DOUBLE_PRESS_MS).toBe(600);
		const { result } = renderHook(() => useHeroPlayer());
		const { play, video } = mountControls();
		result.current.playRef.current = play;
		result.current.videoRef.current = video;
		play.focus();
		act(() => result.current.start());
		// the other half of a double click: the clip keeps coming
		advance(180);
		let ended = true;
		act(() => {
			ended = result.current.cancel();
		});
		expect(ended).toBe(false);
		expect(result.current.playing).toBe(true);
		// a press a moment later is a change of mind
		advance(DOUBLE_PRESS_MS);
		act(() => {
			ended = result.current.cancel();
		});
		expect(ended).toBe(true);
		expect(result.current.playing).toBe(false);
		expect(result.current.failed).toBe(false);
		// the focus stays on the mark, which is still there
		expect(document.activeElement).toBe(play);
		// Escape is deliberate whenever it comes
		act(() => result.current.start());
		advance(50);
		act(() => {
			ended = result.current.cancel(true);
		});
		expect(ended).toBe(true);
		expect(result.current.playing).toBe(false);
		// the clock left with the wait: nothing fires later
		advance(STALL_MS * 2);
		expect(result.current.failed).toBe(false);
	});

	it("has nothing to give up at rest or once the clip shows", () => {
		const { result } = renderHook(() => useHeroPlayer());
		expect(result.current.cancel(true)).toBe(false);
		act(() => result.current.start());
		act(() => result.current.markReady());
		advance(DOUBLE_PRESS_MS);
		let ended = true;
		act(() => {
			ended = result.current.cancel(true);
		});
		expect(ended).toBe(false);
		expect(result.current.ready).toBe(true);
	});

	it("a fetch or a stream that fails under the person's eyes returns to rest marked failed; one that fails with nobody waiting is silent", () => {
		const { result } = renderHook(() => useHeroPlayer());
		// the clip fetched ahead failed before any press: nothing to show
		act(() => result.current.fail());
		expect(result.current.failed).toBe(false);
		act(() => result.current.start());
		act(() => result.current.fail());
		expect(result.current.playing).toBe(false);
		expect(result.current.failed).toBe(true);
		// a clip that fails while it plays, too
		act(() => {
			result.current.start();
			result.current.markReady();
		});
		act(() => result.current.fail());
		expect(result.current.playing).toBe(false);
		expect(result.current.ready).toBe(false);
		expect(result.current.failed).toBe(true);
	});

	it("leaves no clock running when the page goes", () => {
		const { result, unmount } = renderHook(() => useHeroPlayer());
		act(() => result.current.start());
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("the clock keeps running until the PICTURE is on: a first decoded frame is only a step closer, a clip that never plays past its lead-in is a stall", () => {
		const { result } = renderHook(() => useHeroPlayer());
		const p = fakePlayer();
		act(() => result.current.start());
		// as the route wires it: the watch reports the picture, the media events only say the clip is getting closer
		watchFirstFrame(p.player, () => result.current.markReady(), CNBC_FADE_IN);
		advance(10_000);
		act(() => {
			p.decode(); // loadeddata
			result.current.progress();
		});
		// the first frame is decoded and even presented, black: the hero still waits, on a fresh 15 s
		act(() => p.present(0));
		expect(result.current.ready).toBe(false);
		advance(STALL_MS - 1);
		expect(result.current.playing).toBe(true);
		expect(result.current.failed).toBe(false);
		// nothing moved past the lead-in: back to rest by itself, marked failed
		advance(1);
		expect(result.current.playing).toBe(false);
		expect(result.current.ready).toBe(false);
		expect(result.current.failed).toBe(true);
		// a frame that arrives after the hero went back to rest shows nothing
		act(() => p.present(CNBC_FADE_IN));
		expect(result.current.ready).toBe(false);
	});

	it("a clip that plays through its lead-in shows then, and the clock ends with it", () => {
		const { result } = renderHook(() => useHeroPlayer());
		const p = fakePlayer();
		act(() => result.current.start());
		watchFirstFrame(p.player, () => result.current.markReady(), CNBC_FADE_IN);
		act(() => {
			p.decode();
			result.current.progress();
		});
		for (const t of [0, 1 / 30, 0.2, 0.4, 0.567]) {
			act(() => p.present(t));
			expect(result.current.ready, `${t} s`).toBe(false);
		}
		act(() => p.present(0.6));
		expect(result.current.ready).toBe(true);
		advance(STALL_MS * 4);
		expect(result.current.playing).toBe(true);
		expect(result.current.ready).toBe(true);
		expect(result.current.failed).toBe(false);
	});
});

describe("the first frame is the first one that shows the PICTURE (the review of 2026-11-09: the two CNBC clips went poster, black player, picture)", () => {
	it("a clip that opens on its picture shows at its first MOVING frame: the decoded frame at 0 reports nothing, the next one does, once", () => {
		const p = fakePlayer();
		const onFrame = vi.fn();
		watchFirstFrame(p.player, onFrame);
		// loadeddata was the report: the frame at the playback position, which a player may hold for a second before it starts
		p.decode();
		expect(onFrame).not.toHaveBeenCalled();
		p.present(0);
		expect(onFrame).not.toHaveBeenCalled();
		expect(p.waitingFrames()).toBe(1); // it asked for the next frame
		p.present(1 / 30);
		expect(onFrame).toHaveBeenCalledTimes(1);
		// reported once: later frames and timeupdates find nobody listening
		p.present(2 / 30);
		p.tick(0.25);
		expect(onFrame).toHaveBeenCalledTimes(1);
		expect(p.waitingFrames()).toBe(0);
		expect(p.listening("timeupdate")).toBe(0);
	});

	it("a clip with a lead-in holds the poster through it: the CNBC clips' 0.6 s fade from black", () => {
		const p = fakePlayer();
		const onFrame = vi.fn();
		watchFirstFrame(p.player, onFrame, CNBC_FADE_IN);
		p.decode();
		// 18 frames at 30 fps, from black (0 s) to the settled picture (0.6 s): none of the dark ones shows the player
		for (let frame = 0; frame < 18; frame++) {
			p.present(frame / 30);
			if (frame === 6) p.tick(0.19);
			if (frame === 14) p.tick(0.45);
			expect(onFrame, `frame ${frame}`).not.toHaveBeenCalled();
		}
		p.present(18 / 30);
		expect(onFrame).toHaveBeenCalledTimes(1);
	});

	it("the two CNBC clips carry that lead-in and no other clip has one (the VOA and X clips open on their picture)", () => {
		expect(CNBC_FADE_IN).toBe(0.6);
		expect(STORY_CLIPS["nvidia-chip-rally"]?.leadIn).toBe(0.6);
		expect(STORY_CLIPS["apple-foldable"]?.leadIn).toBe(0.6);
		for (const [id, clip] of Object.entries(STORY_CLIPS)) {
			expect(clip.leadIn !== undefined, id).toBe(new URL(clip.url).hostname === "pdl-iphone-cnbc-com.akamaized.net");
		}
	});

	it("without frame callbacks the playback position at a timeupdate is the signal: 0 reports nothing, the first one past zero does", () => {
		const p = fakePlayer({ frames: false });
		const onFrame = vi.fn();
		watchFirstFrame(p.player, onFrame);
		p.decode();
		p.tick(0); // a browser fires timeupdate as playback begins, still on the first frame
		expect(onFrame).not.toHaveBeenCalled();
		p.tick(0.19);
		expect(onFrame).toHaveBeenCalledTimes(1);
		p.tick(0.45);
		expect(onFrame).toHaveBeenCalledTimes(1);
		// and through a lead-in: the first timeupdate at or past it
		const slow = fakePlayer({ frames: false });
		const onSlow = vi.fn();
		watchFirstFrame(slow.player, onSlow, CNBC_FADE_IN);
		slow.decode();
		slow.tick(0.19);
		slow.tick(0.45);
		expect(onSlow).not.toHaveBeenCalled();
		slow.tick(0.7);
		expect(onSlow).toHaveBeenCalledTimes(1);
	});

	it("whichever comes first reports, once: a timeupdate while a hidden player's frame callbacks are held back, or the frame", () => {
		const p = fakePlayer();
		const onFrame = vi.fn();
		watchFirstFrame(p.player, onFrame);
		p.decode();
		p.tick(0.19); // no frame callback has run yet
		expect(onFrame).toHaveBeenCalledTimes(1);
		// the frame callback it had asked for was cancelled with the watch
		expect(p.waitingFrames()).toBe(0);
		p.present(0.2);
		expect(onFrame).toHaveBeenCalledTimes(1);
	});

	it("a browser with neither signal keeps the first decoded frame (loadeddata) as its report; one already holding a frame reports at once", () => {
		const p = fakePlayer({ frames: false, times: false });
		const onFrame = vi.fn();
		watchFirstFrame(p.player, onFrame, CNBC_FADE_IN);
		expect(p.listening("timeupdate")).toBe(0);
		expect(onFrame).not.toHaveBeenCalled();
		p.decode();
		expect(onFrame).toHaveBeenCalledTimes(1);
		p.fire("loadeddata");
		expect(onFrame).toHaveBeenCalledTimes(1);
		const held = fakePlayer({ frames: false, times: false });
		held.player.readyState = 2;
		const onHeld = vi.fn();
		watchFirstFrame(held.player, onHeld);
		expect(onHeld).toHaveBeenCalledTimes(1);
	});

	it("a player already past the lead-in when the watch starts reports at once; one that only holds its first frame does not", () => {
		const playing = fakePlayer();
		playing.player.readyState = 4;
		playing.player.currentTime = 12.4;
		const onPlaying = vi.fn();
		watchFirstFrame(playing.player, onPlaying, CNBC_FADE_IN);
		expect(onPlaying).toHaveBeenCalledTimes(1);
		expect(playing.waitingFrames()).toBe(0);
		expect(playing.listening("timeupdate")).toBe(0);
		// a frame in hand at 0 s, or part of the way through the lead-in, is not the picture yet
		for (const at of [0, 0.3]) {
			const holding = fakePlayer();
			holding.player.readyState = 4;
			holding.player.currentTime = at;
			const onHolding = vi.fn();
			watchFirstFrame(holding.player, onHolding, CNBC_FADE_IN);
			expect(onHolding, `${at} s`).not.toHaveBeenCalled();
			holding.present(CNBC_FADE_IN);
			expect(onHolding, `${at} s`).toHaveBeenCalledTimes(1);
		}
	});

	it("ending the watch leaves nothing behind (the player goes, or the browser refused to start it): no listener, no frame callback, no late report", () => {
		const p = fakePlayer();
		const onFrame = vi.fn();
		const stop = watchFirstFrame(p.player, onFrame);
		expect(p.listening("timeupdate")).toBe(1);
		expect(p.waitingFrames()).toBe(1);
		stop();
		expect(p.listening("timeupdate")).toBe(0);
		expect(p.listening("loadeddata")).toBe(0);
		expect(p.waitingFrames()).toBe(0);
		p.present(1);
		p.tick(1.2);
		p.decode();
		expect(onFrame).not.toHaveBeenCalled();
		// ending it twice is harmless
		stop();
	});

	it("a lead-in that is not a positive number counts as none", () => {
		for (const leadIn of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			const p = fakePlayer();
			const onFrame = vi.fn();
			watchFirstFrame(p.player, onFrame, leadIn);
			p.present(0);
			expect(onFrame, String(leadIn)).not.toHaveBeenCalled();
			p.present(1 / 30);
			expect(onFrame, String(leadIn)).toHaveBeenCalledTimes(1);
		}
	});

	it("works on a real video element (jsdom has timeupdate and no frame callbacks): the position, not the first frame", () => {
		const video = document.createElement("video");
		document.body.append(video);
		const onFrame = vi.fn();
		const stop = watchFirstFrame(video, onFrame);
		video.dispatchEvent(new Event("loadeddata"));
		video.dispatchEvent(new Event("timeupdate")); // currentTime 0
		expect(onFrame).not.toHaveBeenCalled();
		Object.defineProperty(video, "currentTime", { configurable: true, value: 0.04 });
		video.dispatchEvent(new Event("timeupdate"));
		expect(onFrame).toHaveBeenCalledTimes(1);
		stop();
	});
});
