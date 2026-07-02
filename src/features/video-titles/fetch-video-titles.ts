/**
 * @module
 *
 * Fetches and normalizes all video titles for a Bilibili creator via
 * paginated archive search. Supports `--skip-fetch` by reading cached CSV.
 */
import { sleep } from "../../shared/sleep.ts";
import type { BilibiliClient } from "../bilibili-api/client.ts";
import type { ArcSearchVideo } from "../bilibili-api/types.ts";
import type { FetchVideoTitlesOptions, VideoEntry } from "./types.ts";

/**
 * Map a raw archive search result to a normalized {@link VideoEntry}.
 *
 * @param video - Raw video record from `vlist[]`.
 * @returns Normalized entry, or `undefined` if `title`, `bvid`, or `aid` is invalid.
 */
export function mapArchiveVideo(video: ArcSearchVideo): VideoEntry | undefined {
  const title = video.title?.trim();
  const bvid = video.bvid?.trim();
  const aid = Number(video.aid ?? 0);
  const created = Number(video.created ?? video.pubdate ?? 0);

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
 * Paginate `/x/space/wbi/arc/search` until all videos are fetched.
 *
 * Stops when page returns zero results, or when `videos.length >= expectedTotal`.
 * Sleeps 1.2 s between pages to avoid rate‑limiting.
 * Deduplicates by `bvid` and sorts newest‑first.
 *
 * @param client - Bilibili API client.
 * @param options - Fetch options (mid, pageSize).
 * @returns Deduplicated, sorted video entries.
 */
export async function fetchVideoTitles(
  client: BilibiliClient,
  options: FetchVideoTitlesOptions,
): Promise<VideoEntry[]> {
  const videos: VideoEntry[] = [];
  let expectedTotal: number | undefined;
  let page = 1;

  while (expectedTotal === undefined || videos.length < expectedTotal) {
    const response = await client.searchSpaceArchives({
      mid: options.mid,
      page,
      pageSize: options.pageSize,
    });
    const pageVideos = response.data?.list?.vlist ?? [];
    if (expectedTotal === undefined) {
      expectedTotal = response.data?.page?.count;
    }

    const mapped = pageVideos
      .map((video) => mapArchiveVideo(video))
      .filter((video): video is VideoEntry => video !== undefined);
    videos.push(...mapped);

    if (pageVideos.length === 0 || mapped.length === 0) break;
    if (expectedTotal !== undefined && videos.length >= expectedTotal) break;

    page += 1;
    await sleep(1200);
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
