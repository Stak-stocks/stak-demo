import { describe, expect, it } from "vitest";
import { CATEGORY_NAMES } from "@stak/shared";
import { collectionArtUrl } from "@/lib/collectionArt";

// The files actually shipped in public/collections (keys like "../../../public/collections/chips.webp").
const shipped = new Set(
	Object.keys(import.meta.glob("../../../public/collections/*.webp")).map((k) => k.replace("../../../public", "")),
);

describe("collectionArtUrl", () => {
	it("has a photo for every collection name, and the file exists", () => {
		for (const name of new Set(Object.values(CATEGORY_NAMES))) {
			const url = collectionArtUrl(name);
			expect(url, name).not.toBeNull();
			expect(shipped.has(url!), url!).toBe(true);
		}
	});

	it("leaves the catch-all Other collection to the company-art fallback", () => {
		expect(collectionArtUrl("Other")).toBeNull();
	});
});
