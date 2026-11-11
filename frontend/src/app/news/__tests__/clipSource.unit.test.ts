import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIP_STEP_BYTES, prefetchAllowed, readClip, useClipSource } from "../clipSource";
import { clipOf, type StoryClip } from "../media";

/** a response whose body arrives in the given chunks */
const streamed = (sizes: readonly number[], init: ResponseInit = { headers: { "content-type": "video/mp4" } }) =>
	new Response(
		new ReadableStream<Uint8Array>({
			start(controller) {
				for (const n of sizes) controller.enqueue(new Uint8Array(n).fill(7));
				controller.close();
			},
		}),
		init,
	);

describe("fetching a clip ahead of the press (the phones buffer from the moment the article opens)", () => {
	it("is allowed wherever the browser gives no reason to hold back", () => {
		// no Network Information API (Safari, Firefox): as the phone apps, which buffer on any link
		expect(prefetchAllowed({})).toBe(true);
		expect(prefetchAllowed(undefined)).toBe(true);
		expect(prefetchAllowed({ connection: {} })).toBe(true);
		expect(prefetchAllowed({ connection: { saveData: false, effectiveType: "4g" } })).toBe(true);
	});

	it("is not under the browser's data saver, nor on a link it rates below 4g", () => {
		expect(prefetchAllowed({ connection: { saveData: true, effectiveType: "4g" } })).toBe(false);
		for (const slow of ["slow-2g", "2g", "3g"]) expect(prefetchAllowed({ connection: { effectiveType: slow } }), slow).toBe(false);
	});

	it("reads the browser's own hints by default", () => {
		expect(typeof prefetchAllowed()).toBe("boolean");
	});
});

describe("reading a fetched clip into memory (readClip)", () => {
	it("keeps the whole clip and its type, and reports each further 512 kB and the end", async () => {
		expect(CLIP_STEP_BYTES).toBe(512 * 1024);
		const onStep = vi.fn();
		// 1.25 MB in 100 kB chunks: a step once 600 kB are in (the first chunk past 512 kB), another at 1.2 MB, then the end
		const sizes = Array.from({ length: 12 }, () => 100 * 1024).concat(50 * 1024);
		const clip = await readClip(streamed(sizes), onStep);
		expect(clip.size).toBe(1250 * 1024);
		expect(clip.type).toBe("video/mp4");
		expect(onStep).toHaveBeenCalledTimes(3);
	});

	it("a trickle reports nothing before the end: under 512 kB the stall clock is left to run", async () => {
		const onStep = vi.fn();
		let link!: ReadableStreamDefaultController<Uint8Array>;
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				link = controller;
				// 3 kB at a time, 45 kB in all: what a stalled link brings in the clock's 15 s
				for (let i = 0; i < 15; i++) controller.enqueue(new Uint8Array(3000));
			},
		});
		const reading = readClip(new Response(body, { headers: { "content-type": "video/mp4" } }), onStep);
		await new Promise((r) => setTimeout(r, 20));
		expect(onStep).not.toHaveBeenCalled();
		link.close();
		expect((await reading).size).toBe(45_000);
		expect(onStep).toHaveBeenCalledTimes(1);
	});

	it("names the clip video/mp4 when the host sends no type, and reads a response without a readable body in one piece", async () => {
		const untyped = new Response(new ReadableStream<Uint8Array>({ start: (c) => (c.enqueue(new Uint8Array(10)), c.close()) }));
		untyped.headers.delete("content-type");
		expect((await readClip(untyped, () => {})).type).toBe("video/mp4");
		const onStep = vi.fn();
		const whole = new Blob(["clip"], { type: "video/mp4" });
		const bodiless = { ok: true, status: 200, headers: new Headers(), body: null, blob: async () => whole } as unknown as Response;
		expect(await readClip(bodiless, onStep)).toBe(whole);
		expect(onStep).toHaveBeenCalledTimes(1);
	});

	it("refuses an answer that is not the clip (the host's 403 to a request that names a referrer)", async () => {
		await expect(readClip(new Response("Forbidden", { status: 403 }), () => {})).rejects.toThrow("403");
	});
});

describe("the hero's clip source (useClipSource)", () => {
	const twimg = clipOf("oil-slips-iran") as StoryClip;
	const cnbc = clipOf("nvidia-chip-rally") as StoryClip;
	type Call = { url: string; init: RequestInit; resolve: (r: Response) => void; reject: (e: unknown) => void };
	let calls: Call[] = [];
	const made: string[] = [];
	const revoked: string[] = [];
	const createObjectURL = URL.createObjectURL;
	const revokeObjectURL = URL.revokeObjectURL;

	beforeEach(() => {
		calls = [];
		made.length = 0;
		revoked.length = 0;
		vi.stubGlobal(
			"fetch",
			vi.fn(
				(url: string, init: RequestInit) =>
					new Promise<Response>((resolve, reject) => {
						calls.push({ url, init, resolve, reject });
						init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
					}),
			),
		);
		URL.createObjectURL = vi.fn(() => {
			const url = `blob:clip-${made.length + 1}`;
			made.push(url);
			return url;
		});
		URL.revokeObjectURL = vi.fn((url: string) => {
			revoked.push(url);
		});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		URL.createObjectURL = createObjectURL;
		URL.revokeObjectURL = revokeObjectURL;
	});
	/** lets the fetch's promise chain run */
	const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

	it("a streamed clip is its own URL from the start and is never fetched; no clip is nothing", () => {
		const { result } = renderHook(() => useClipSource(cnbc, vi.fn(), vi.fn()));
		expect(cnbc.noReferrer).toBeUndefined();
		expect(result.current.url).toBe(cnbc.url);
		act(() => result.current.request());
		expect(calls).toHaveLength(0);
		const none = renderHook(() => useClipSource(null, vi.fn(), vi.fn()));
		act(() => none.result.current.request());
		expect(none.result.current.url).toBeNull();
		expect(calls).toHaveLength(0);
	});

	it("a clip whose host refuses the referrer is fetched without one, once, into memory, and stays there for a replay", async () => {
		const onStep = vi.fn();
		const { result } = renderHook(() => useClipSource(twimg, onStep, vi.fn()));
		expect(result.current.url).toBeNull();
		expect(calls).toHaveLength(0); // nothing is asked for until the hero says so
		act(() => result.current.request());
		act(() => result.current.request()); // the pointer reaches the mark, then the press: one fetch
		expect(calls).toHaveLength(1);
		expect(calls[0]!.url).toBe(twimg.url);
		expect(calls[0]!.init.referrerPolicy).toBe("no-referrer");
		expect(result.current.url).toBeNull();
		calls[0]!.resolve(streamed([600 * 1024, 10]));
		await settle();
		expect(result.current.url).toBe("blob:clip-1");
		expect(onStep).toHaveBeenCalledTimes(2); // 600 kB in, then the end
		act(() => result.current.request());
		expect(calls).toHaveLength(1);
		// giving a later wait up leaves the clip in memory
		act(() => result.current.cancel());
		expect(result.current.url).toBe("blob:clip-1");
		expect(revoked).toEqual([]);
	});

	it("a fetch that fails tells the hero, and the next press tries again", async () => {
		const onFail = vi.fn();
		const { result } = renderHook(() => useClipSource(twimg, vi.fn(), onFail));
		act(() => result.current.request());
		calls[0]!.resolve(new Response("Forbidden", { status: 403 }));
		await settle();
		expect(onFail).toHaveBeenCalledTimes(1);
		expect(result.current.url).toBeNull();
		act(() => result.current.request());
		expect(calls).toHaveLength(2);
		calls[1]!.resolve(streamed([1000]));
		await settle();
		expect(result.current.url).toBe("blob:clip-1");
		expect(onFail).toHaveBeenCalledTimes(1);
	});

	it("a dropped fetch (a stalled link, a wait given up under the data saver) stops, reports nothing, and can start afresh", async () => {
		const onFail = vi.fn();
		const { result } = renderHook(() => useClipSource(twimg, vi.fn(), onFail));
		act(() => result.current.request());
		const signal = calls[0]!.init.signal as AbortSignal;
		act(() => result.current.cancel());
		expect(signal.aborted).toBe(true);
		await settle();
		expect(onFail).not.toHaveBeenCalled();
		expect(result.current.url).toBeNull();
		act(() => result.current.request());
		expect(calls).toHaveLength(2);
	});

	it("releases the clip, and stops a fetch under way, when the page goes", async () => {
		const first = renderHook(() => useClipSource(twimg, vi.fn(), vi.fn()));
		act(() => first.result.current.request());
		calls[0]!.resolve(streamed([1000]));
		await settle();
		expect(first.result.current.url).toBe("blob:clip-1");
		first.unmount();
		expect(revoked).toEqual(["blob:clip-1"]);
		const second = renderHook(() => useClipSource(twimg, vi.fn(), vi.fn()));
		act(() => second.result.current.request());
		const signal = calls[1]!.init.signal as AbortSignal;
		second.unmount();
		expect(signal.aborted).toBe(true);
	});
});
