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

const apiBase = "https://api.bilibili.com";
const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com/",
};

export interface BilibiliClientOptions {
  cookie: string;
  fetchImpl?: FetchLike;
}

type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

export class BilibiliClient {
  private readonly fetchImpl: FetchLike;
  private wbiKeys?: WbiKeys;

  constructor(private readonly options: BilibiliClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getSpaceInfo(mid: string): Promise<SpaceInfoResponse> {
    return this.getWbiJson<SpaceInfoResponse>("/x/space/wbi/acc/info", {
      mid,
    });
  }

  async getUpStat(mid: string): Promise<UpStatResponse> {
    return this.getJson<UpStatResponse>("/x/space/upstat", { mid });
  }

  async getTopArc(mid: string): Promise<TopArcResponse> {
    return this.getJson<TopArcResponse>("/x/space/top/arc", { vmid: mid });
  }

  async getVideoView(bvid: string): Promise<VideoViewResponse> {
    return this.getWbiJson<VideoViewResponse>("/x/web-interface/wbi/view", {
      bvid,
    });
  }

  async searchSpaceArchives(params: {
    mid: string;
    page: number;
    pageSize: number;
  }): Promise<ArcSearchResponse> {
    // Official Bilibili Wbi endpoint; not present in BACNext OpenAPI main.json yet.
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

  private async getWbiJson<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<T> {
    const signed = signWbiParams(params, await this.getWbiKeys());
    return this.requestJson<T>(path, signed);
  }

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
