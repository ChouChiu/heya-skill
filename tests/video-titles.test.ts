/**
 * @module
 *
 * Unit tests for video title fetching — data mapping and pagination logic
 * via the UApi `/social/bilibili/archives` endpoint.
 */
import { expect, test } from "bun:test";
import {
	fetchVideoTitles,
	mapArchiveVideo,
	type UapiVideo,
} from "../src/features/video-titles/fetch-video-titles.ts";

test("maps UApi archive videos to normalized entries", () => {
	const video: UapiVideo = {
		aid: 1,
		bvid: "BV1",
		title: "标题",
		publish_time: 1700000000,
	};
	expect(mapArchiveVideo(video)).toEqual({
		aid: 1,
		bvid: "BV1",
		title: "标题",
		created: 1700000000,
		createdDate: "2023-11-14",
	});
});

test("maps UApi video with create_time fallback", () => {
	const video: UapiVideo = {
		aid: 2,
		bvid: "BV2",
		title: "标题二",
		create_time: 1700001000,
	};
	expect(mapArchiveVideo(video)?.created).toBe(1700001000);
});

test("skips video with missing title", () => {
	expect(
		mapArchiveVideo({ aid: 1, bvid: "BV1", title: "", publish_time: 1 }),
	).toBeUndefined();
});

test("stops pagination when expected total is reached", async () => {
	const calls: number[] = [];
	const client = {
		social: {
			async getSocialBilibiliArchives({ pn }: { pn: string }) {
				calls.push(Number(pn));
				return {
					total: 1,
					page: 1,
					size: 30,
					videos: [
						{
							aid: 1,
							bvid: "BV1",
							title: "标题",
							publish_time: 1700000000,
						},
					],
				};
			},
		},
	};

	const videos = await fetchVideoTitles(client as never, {
		mid: "1",
		pageSize: 30,
	});
	expect(videos).toHaveLength(1);
	expect(calls).toEqual([1]);
});

test("paginates multiple pages", async () => {
	const calls: string[] = [];
	const client = {
		social: {
			async getSocialBilibiliArchives({ pn }: { pn: string }) {
				calls.push(pn);
				if (pn === "1") {
					return {
						total: 2,
						videos: [
							{
								aid: 1,
								bvid: "BV1",
								title: "标题一",
								publish_time: 1700000000,
							},
						],
					};
				}
				return {
					total: 2,
					videos: [
						{ aid: 2, bvid: "BV2", title: "标题二", publish_time: 1700000100 },
					],
				};
			},
		},
	};

	const videos = await fetchVideoTitles(client as never, {
		mid: "1",
		pageSize: 1,
		pageDelayMs: 0,
	});
	expect(videos).toHaveLength(2);
	expect(calls).toEqual(["1", "2"]);
});

test("continues pagination when a page only has invalid records", async () => {
	const calls: string[] = [];
	const client = {
		social: {
			async getSocialBilibiliArchives({ pn }: { pn: string }) {
				calls.push(pn);
				if (pn === "1") {
					return {
						total: 2,
						videos: [
							{
								aid: 1,
								bvid: "BV1",
								title: "",
								publish_time: 1700000000,
							},
						],
					};
				}
				return {
					total: 2,
					videos: [
						{
							aid: 2,
							bvid: "BV2",
							title: "标题二",
							publish_time: 1700000100,
						},
					],
				};
			},
		},
	};

	const videos = await fetchVideoTitles(client as never, {
		mid: "1",
		pageSize: 1,
		pageDelayMs: 0,
	});
	expect(videos.map((video) => video.bvid)).toEqual(["BV2"]);
	expect(calls).toEqual(["1", "2"]);
});

test("deduplicates by bvid", async () => {
	const client = {
		social: {
			async getSocialBilibiliArchives() {
				return {
					total: 2,
					videos: [
						{ aid: 1, bvid: "BV1", title: "标题", publish_time: 1700000000 },
						{ aid: 2, bvid: "BV1", title: "标题", publish_time: 1700000000 },
					],
				};
			},
		},
	};

	const videos = await fetchVideoTitles(client as never, {
		mid: "1",
		pageSize: 30,
	});
	expect(videos).toHaveLength(1);
});
