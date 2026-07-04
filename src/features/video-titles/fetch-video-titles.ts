/**
 * @module
 *
 * Fetches and normalizes all video titles for a Bilibili creator via
 * the UApi proxy API (`/social/bilibili/archives`).
 *
 * Supports `--skip-fetch` by reading cached CSV.
 */
import type { UapiClient } from "uapi-sdk-typescript";
import { sleep } from "../../shared/sleep.ts";
import type { FetchVideoTitlesOptions, VideoEntry } from "./types.ts";

/** Raw video record returned by UApi `/social/bilibili/archives`. */
export interface UapiVideo {
	aid?: number;
	bvid?: string;
	title?: string;
	publish_time?: number;
	create_time?: number;
}

/**
 * Map a raw UApi video record to a normalized {@link VideoEntry}.
 *
 * Preference: `publish_time` > `create_time` for the `created` field.
 *
 * @param video - Raw video record from the `videos[]` array.
 * @returns Normalized entry, or `undefined` if required fields are invalid.
 */
export function mapArchiveVideo(video: UapiVideo): VideoEntry | undefined {
	const title = video.title?.trim();
	const bvid = video.bvid?.trim();
	const aid = Number(video.aid ?? 0);
	const created = Number(video.publish_time ?? video.create_time ?? 0);

	if (!title || !bvid || !Number.isFinite(aid) || created === 0) {
		return undefined;
	}

	return {
		aid,
		bvid,
		title,
		created,
		createdDate: new Date(created * 1000).toISOString().slice(0, 10),
	};
}

/**
 * Paginate `/social/bilibili/archives` until all videos are fetched.
 *
 * Stops when page returns zero results, when the raw fetched count reaches
 * `total`, or when an API response without `total` returns a short page.
 * Sleeps 1.2 s between pages to respect UApi rate limits.
 * Deduplicates by `bvid` and sorts newest‑first.
 *
 * @param client - UApi client.
 * @param options - Fetch options (mid, pageSize, optional pageDelayMs).
 * @returns Deduplicated, sorted video entries.
 */
export async function fetchVideoTitles(
	client: UapiClient,
	options: FetchVideoTitlesOptions,
): Promise<VideoEntry[]> {
	const videos: VideoEntry[] = [];
	let total: number | undefined;
	let fetchedRawCount = 0;
	let page = 1;

	while (total === undefined || fetchedRawCount < total) {
		const response = await client.social.getSocialBilibiliArchives({
			mid: options.mid,
			pn: String(page),
			ps: String(options.pageSize),
			orderby: "pubdate",
		});

		const pageVideos = response.videos ?? [];
		if (
			total === undefined &&
			typeof response.total === "number" &&
			Number.isFinite(response.total)
		) {
			total = response.total;
		}
		fetchedRawCount += pageVideos.length;

		const mapped = pageVideos
			.map((video) => mapArchiveVideo(video))
			.filter((video): video is VideoEntry => video !== undefined);
		videos.push(...mapped);

		if (pageVideos.length === 0) break;
		if (total !== undefined && fetchedRawCount >= total) break;
		if (total === undefined && pageVideos.length < options.pageSize) break;

		page += 1;
		await sleep(options.pageDelayMs ?? 1200);
	}

	return dedupeVideos(videos);
}

/**
 * Remove duplicate entries by `bvid` and sort newest‑first by `created`.
 *
 * @param videos - Possibly duplicated list.
 * @returns Deduplicated list sorted by `created` descending.
 */
export function dedupeVideos(videos: VideoEntry[]): VideoEntry[] {
	const seen = new Set<string>();
	const deduped: VideoEntry[] = [];

	for (const video of videos) {
		if (seen.has(video.bvid)) continue;
		seen.add(video.bvid);
		deduped.push(video);
	}

	return deduped.sort((a, b) => b.created - a.created);
}
