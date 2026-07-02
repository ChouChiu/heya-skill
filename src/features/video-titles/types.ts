export interface VideoEntry {
  aid: number;
  bvid: string;
  title: string;
  created: number;
  createdDate: string;
}

export interface FetchVideoTitlesOptions {
  mid: string;
  pageSize: number;
}
