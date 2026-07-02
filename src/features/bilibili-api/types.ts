export type SpaceInfoResponse = BilibiliEnvelope<Record<string, unknown>>;
export type UpStatResponse = BilibiliEnvelope<Record<string, unknown>>;
export type TopArcResponse = BilibiliEnvelope<Record<string, unknown>>;
export type VideoViewResponse = BilibiliEnvelope<Record<string, unknown>>;

export interface BilibiliEnvelope<T> {
  code: number;
  message: string;
  ttl?: number;
  data: T;
}

export interface NavWbiResponse {
  code: number;
  message: string;
  data?: {
    wbi_img?: {
      img_url?: string;
      sub_url?: string;
    };
  };
}

export interface ArcSearchVideo {
  aid?: number;
  bvid?: string;
  title?: string;
  created?: number;
  pubdate?: number;
  description?: string;
  length?: string;
}

export interface ArcSearchResponse {
  code: number;
  message: string;
  data?: {
    page?: {
      count?: number;
      pn?: number;
      ps?: number;
    };
    list?: {
      vlist?: ArcSearchVideo[];
    };
  };
}
