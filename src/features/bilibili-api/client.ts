import { BilibiliApiError, isRiskControlHtml } from "./errors.ts";
import type {
	ArcSearchResponse,
	NavWbiResponse,
	SpaceInfoResponse,
	TopArcResponse,
	UpStatResponse,
	VideoViewResponse,
} from "./types.ts";
import { extractWbiKey, signWbiParams, type WbiKeys } from "./wbi.ts";

// Base URL for all Bilibili API requests.
const apiBase = "https://api.bilibili.com";

// Default headers to mimic a browser — reduce 412 risk‑control triggers.
const defaultHeaders = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	Referer: "https://www.bilibili.com/",
};

export interface BilibiliClientOptions {
	cookie: string;
	fetchImpl?: FetchLike;
}

/** Minimal fetch signature — allows injection of mock / alternative HTTP clients. */
export type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

/**
 * Typed client for Bilibili's internal JSON API.
 *
 * Endpoints:
 * - `GET /x/space/wbi/acc/info` — space info
 * - `GET /x/space/upstat` — UP stats
 * - `GET /x/space/top/arc` — top videos
 * - `GET /x/web-interface/wbi/view` — video detail
 * - `GET /x/space/wbi/arc/search` — archive pagination
 *
 * Wbi‑signed endpoints fetch fresh keys from `/x/web-interface/nav` on first call.
 *
 * @param options.cookie - Bilibili login cookie string.
 * @param options.fetchImpl - Injectable fetch (defaults to global `fetch`).
 */
export class BilibiliClient {
	private readonly fetchImpl: FetchLike;
	private wbiKeys?: WbiKeys;

	constructor(private readonly options: BilibiliClientOptions) {
		this.fetchImpl = options.fetchImpl ?? fetch;
	}

	/**
	 * @param mid - Bilibili user ID.
	 * @returns Space info (Wbi‑signed).
	 */
	async getSpaceInfo(mid: string): Promise<SpaceInfoResponse> {
		return this.getWbiJson<SpaceInfoResponse>("/x/space/wbi/acc/info", {
			mid,
		});
	}

	/**
	 * @param mid - Bilibili user ID.
	 */
	async getUpStat(mid: string): Promise<UpStatResponse> {
		return this.getJson<UpStatResponse>("/x/space/upstat", { mid });
	}

	/**
	 * @param mid - Bilibili user ID.
	 */
	async getTopArc(mid: string): Promise<TopArcResponse> {
		return this.getJson<TopArcResponse>("/x/space/top/arc", { vmid: mid });
	}

	/**
	 * @param bvid - Bilibili video BV ID.
	 * @returns Video detail (Wbi‑signed).
	 */
	async getVideoView(bvid: string): Promise<VideoViewResponse> {
		return this.getWbiJson<VideoViewResponse>("/x/web-interface/wbi/view", {
			bvid,
		});
	}

	/**
	 * Paginate through a creator's video archive.
	 *
	 * @param params.mid - Bilibili user ID.
	 * @param params.page - 1‑based page number.
	 * @param params.pageSize - Results per page.
	 * @returns Archive search response (Wbi‑signed). Not in BACNext OpenAPI.
	 */
	async searchSpaceArchives(params: {
		mid: string;
		page: number;
		pageSize: number;
	}): Promise<ArcSearchResponse> {
		return this.getWbiJson<ArcSearchResponse>("/x/space/wbi/arc/search", {
			mid: params.mid,
			order: "pubdate",
			pn: params.page,
			ps: params.pageSize,
			tid: 0,
			keyword: "",
			platform: "web",
			web_location: 1550101,
		});
	}

	/**
	 * Fetch and cache Wbi signing keys from `/x/web-interface/nav`.
	 *
	 * Cached in memory — subsequent calls return the stored keys.
	 * Called automatically by {@link BilibiliClient.getWbiJson}.
	 *
	 * @returns The `imgKey` and `subKey` extracted from nav response image URLs.
	 * @throws `BilibiliApiError` if nav response is missing `wbi_img` fields.
	 */
	async getWbiKeys(): Promise<WbiKeys> {
		if (this.wbiKeys) return this.wbiKeys;

		const response = await this.getJson<NavWbiResponse>("/x/web-interface/nav");
		const imgUrl = response.data?.wbi_img?.img_url;
		const subUrl = response.data?.wbi_img?.sub_url;
		if (!imgUrl || !subUrl) {
			throw new BilibiliApiError("Unable to read Wbi keys from nav response");
		}

		this.wbiKeys = {
			imgKey: extractWbiKey(imgUrl),
			subKey: extractWbiKey(subUrl),
		};
		return this.wbiKeys;
	}

	/**
	 * Sign params with Wbi, then dispatch via {@link BilibiliClient.requestJson}.
	 *
	 * @param path - API path (e.g. `/x/space/wbi/arc/search`).
	 * @param params - Query parameters.
	 * @typeParam T - Expected response shape.
	 */
	private async getWbiJson<T>(
		path: string,
		params: Record<string, string | number | boolean | undefined> = {},
	): Promise<T> {
		const signed = signWbiParams(params, await this.getWbiKeys());
		return this.requestJson<T>(path, signed);
	}

	/**
	 * Dispatch unsigned request via {@link BilibiliClient.requestJson}.
	 *
	 * @param path - API path.
	 * @param params - Query parameters (`undefined` values skipped).
	 * @typeParam T - Expected response shape.
	 */
	private async getJson<T>(
		path: string,
		params: Record<string, string | number | boolean | undefined> = {},
	): Promise<T> {
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) search.set(key, String(value));
		}
		return this.requestJson<T>(path, search);
	}

	/**
	 * Central HTTP dispatcher.
	 *
	 * 1. Sends request with cookie + browser‑mimicking headers.
	 * 2. Rejects on 401/403/412, non‑ok status, or risk‑control HTML.
	 * 3. Parses JSON and rejects on non‑zero API `code`.
	 *
	 * @param path - API path (appended to Bilibili API base URL).
	 * @param search - Pre‑built URLSearchParams.
	 * @typeParam T - Expected response shape.
	 * @throws `BilibiliApiError` on any HTTP or API‑level error.
	 */
	private async requestJson<T>(
		path: string,
		search = new URLSearchParams(),
	): Promise<T> {
		const url = new URL(path, apiBase);
		url.search = search.toString();

		const response = await this.fetchImpl(url, {
			headers: {
				...defaultHeaders,
				Cookie: this.options.cookie,
			},
		});
		const body = await response.text();

		if (
			response.status === 401 ||
			response.status === 403 ||
			response.status === 412
		) {
			throw new BilibiliApiError(
				`Bilibili rejected the request with HTTP ${response.status}; check BILIBILI_COOKIE`,
				response.status,
			);
		}
		if (!response.ok) {
			throw new BilibiliApiError(
				`Bilibili request failed with HTTP ${response.status}`,
				response.status,
			);
		}
		if (isRiskControlHtml(body)) {
			throw new BilibiliApiError(
				"Bilibili returned a risk-control HTML page; check BILIBILI_COOKIE",
				412,
			);
		}

		const parsed = JSON.parse(body) as { code?: number; message?: string };
		if (typeof parsed.code === "number" && parsed.code !== 0) {
			throw new BilibiliApiError(
				`Bilibili API error ${parsed.code}: ${parsed.message ?? "unknown error"}`,
			);
		}

		return parsed as T;
	}
}
