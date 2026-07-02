/**
 * Normalized video record (mapped from `ArcSearchVideo`).
 */
export interface VideoEntry {
  aid: number;
  bvid: string;
  title: string;
  /** Unix timestamp (seconds). */
  created: number;
  /** ISO 8601 date string (`YYYY-MM-DD`). */
  createdDate: string;
}

export interface FetchVideoTitlesOptions {
  /** Bilibili user ID (`mid`). */
  mid: string;
  /** Results per page. */
  pageSize: number;
}
