import { describe, expect, it } from "vitest";
import { ARTICLES, articleById, HOME_ARTICLES } from "../articles";
import { clipOf, FIT_TOLERANCE, mediaFit, STORY_CLIPS, sourceHrefOf } from "../media";

describe("the hero's media slot: the phones' clips (D9)", () => {
	it("gives the six stories with a phone twin their clip, and no other story one", () => {
		expect(Object.keys(STORY_CLIPS).sort()).toEqual(
			["apple-foldable", "dow-record-chips", "memory-chips-soar", "nvidia-chip-rally", "oil-slips-iran", "tesla-deliveries"].sort(),
		);
		for (const id of Object.keys(STORY_CLIPS)) expect(articleById(id), id).toBeDefined();
		// the Fed minutes, the June jobs story and Home's two stories have no clip on the phones: no play mark
		for (const id of ["fed-minutes", "june-jobs-miss", ...HOME_ARTICLES.map((a) => a.id)]) expect(clipOf(id), id).toBeNull();
		expect(clipOf("no-such-story")).toBeNull();
	});

	it("are the phones' own URLs, word for word, each naming the Android story it comes from", () => {
		expect(clipOf("tesla-deliveries")).toMatchObject({
			url: "https://video.twimg.com/amplify_video/1477968621418823684/vid/640x360/RK2UN9LzxttCiyIs.mp4?tag=14",
			poster: "https://pbs.twimg.com/media/FILMuTvXMAAk1hK.jpg",
			sourceLink: "https://x.com/SquawkCNBC/status/1477968728969072641",
		});
		expect(clipOf("dow-record-chips")?.ref).toContain("dow-record-chips-slide");
		expect(clipOf("nvidia-chip-rally")?.ref).toContain("nvda-lags-rally");
		expect(clipOf("tesla-deliveries")?.ref).toContain("tsla-drops-deliveries");
		expect(clipOf("oil-slips-iran")?.ref).toContain("oil-opec-supply");
		expect(clipOf("apple-foldable")?.ref).toContain("NewsMedia.demo()");
		for (const clip of Object.values(STORY_CLIPS)) {
			expect(clip.url).toMatch(/^https:\/\/.+\.mp4(\?|$)/);
			expect(clip.sourceLink).toMatch(/^https:\/\//);
			if (clip.poster !== null) expect(clip.poster).toMatch(/^https:\/\//);
		}
	});

	it("keeps Figma's illustration as Apple's poster (the phones' posterRes), a served poster for every other clip", () => {
		expect(clipOf("apple-foldable")?.poster).toBeNull();
		for (const [id, clip] of Object.entries(STORY_CLIPS)) if (id !== "apple-foldable") expect(clip.poster, id).not.toBeNull();
	});

	it("marks the clips whose host refuses the page's referrer (video.twimg.com: 403 with it, 200 without), and only those", () => {
		for (const [id, clip] of Object.entries(STORY_CLIPS)) {
			expect(clip.noReferrer === true, id).toBe(new URL(clip.url).hostname === "video.twimg.com");
		}
		expect(Object.values(STORY_CLIPS).filter((c) => c.noReferrer)).toHaveLength(3);
	});
});

describe("the Source row", () => {
	it("opens the story's own page where its clip carries one, else the publisher's site", () => {
		expect(sourceHrefOf(articleById("oil-slips-iran")!)).toBe("https://x.com/BloombergTV/status/1699393999142879621");
		expect(sourceHrefOf(articleById("apple-foldable")!)).toBe(
			"https://www.cnbc.com/video/2026/04/07/apple-shares-drop-on-dueling-reports-over-foldable-iphone-timeline.html",
		);
		expect(sourceHrefOf(articleById("fed-minutes")!)).toBe("https://www.reuters.com");
		expect(sourceHrefOf(articleById("june-jobs-miss")!)).toBe("https://www.reuters.com");
		for (const a of [...ARTICLES, ...HOME_ARTICLES]) expect(sourceHrefOf(a)).toMatch(/^https:\/\//);
	});
});

describe("how a clip or its poster fills the hero (mediaFit: cover within a tenth of the picture's shape, else letterboxed)", () => {
	const clip = { width: 640, height: 360 }; // the phones' 16:9 clips; their posters are 1200x675, 1280x720, 1080x608

	it("covers a hero near the picture's shape: the frame's 720 x 416 at 1440, the phones' 350 x 208, a tablet's 700 x 407", () => {
		expect(mediaFit({ width: 720, height: 416 }, clip)).toBe("cover");
		expect(mediaFit({ width: 350, height: 208 }, clip)).toBe("cover");
		expect(mediaFit({ width: 700, height: 407 }, clip)).toBe("cover");
		expect(mediaFit({ width: 800, height: 416 }, { width: 1200, height: 675 })).toBe("cover");
	});

	it("letterboxes a hero far off it: 1473 x 416 (a 2560 window), 1043 x 416 (1920), 358 x 319 (a 390 phone), 568 x 414 (600)", () => {
		expect(mediaFit({ width: 1473, height: 416 }, clip)).toBe("contain");
		expect(mediaFit({ width: 1043, height: 416 }, clip)).toBe("contain");
		expect(mediaFit({ width: 820, height: 416 }, clip)).toBe("contain");
		expect(mediaFit({ width: 358, height: 319 }, clip)).toBe("contain");
		expect(mediaFit({ width: 568, height: 414 }, clip)).toBe("contain");
	});

	it("reads a size not yet known as cover (nothing is drawn with it before it is known); the tolerance is a tenth", () => {
		expect(mediaFit({ width: 0, height: 0 }, clip)).toBe("cover");
		expect(mediaFit({ width: 720, height: 416 }, { width: 0, height: 0 })).toBe("cover");
		expect(FIT_TOLERANCE).toBe(0.1);
		expect(mediaFit({ width: 1473, height: 416 }, clip, 3)).toBe("cover");
	});
});
