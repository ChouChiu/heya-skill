/**
 * @module
 *
 * Unit tests for video title fetching — data mapping and pagination logic.
 */
import { expect, test } from "bun:test";
import {
	fetchVideoTitles,
	mapArchiveVideo,
} from "../src/features/video-titles/fetch-video-titles.ts";

test("maps archive search videos to normalized entries", () => {
	expect(
		mapArchiveVideo({
			aid: 1,
			bvid: "BV1",
			title: "标题",
			created: 1700000000,
		}),
	).toEqual({
		aid: 1,
		bvid: "BV1",
		title: "标题",
		created: 1700000000,
		createdDate: "2023-11-14",
	});
});

test("stops pagination when expected total is reached", async () => {
	const calls: number[] = [];
	const client = {
		async searchSpaceArchives({ page }: { page: number }) {
			calls.push(page);
			return {
				code: 0,
				message: "0",
				data: {
					page: { count: 1 },
					list: {
						vlist: [
							{ aid: 1, bvid: "BV1", title: "标题", created: 1700000000 },
						],
					},
				},
			};
		},
	};

	const videos = await fetchVideoTitles(client as never, {
		mid: "1",
		pageSize: 30,
	});
	expect(videos).toHaveLength(1);
	expect(calls).toEqual([1]);
});
