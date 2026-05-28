/**
 * bilibili.ts — 官方 Bilibili API 客户端
 * 直接调用 api.bilibili.com，使用 Wbi 签名
 * Cookie 通过环境变量 BILIBILI_SESSDATA / BILIBILI_BILI_JCT / BILIBILI_REFRESH_TOKEN 提供
 * 支持自动刷新过期 Cookie 并持久化到 .env 文件
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { VideoEntry } from "./types.ts";
import { sleep } from "./utils.ts";

// B站 UID（mid）
export const UID = "3706929260006322";

const PAGE_SIZE = 50;
const API_BASE = "https://api.bilibili.com";
const PASSPORT_BASE = "https://passport.bilibili.com";
const REFERER = "https://www.bilibili.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ---- Wbi 签名 ----

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.map((n) => orig[n])
    .join("")
    .slice(0, 32);
}

function encWbi(
  params: Record<string, string>,
  imgKey: string,
  subKey: string,
): string {
  const mixinKey = getMixinKey(imgKey + subKey);
  const currTime = Math.round(Date.now() / 1000);
  const chrFilter = /[!'()*]/g;

  const wbiParams = { ...params, wts: currTime.toString() };
  const query = Object.keys(wbiParams)
    .sort()
    .map((key) => {
      const value = wbiParams[key].replace(chrFilter, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");

  return createHash("md5")
    .update(query + mixinKey)
    .digest("hex");
}

// ---- Wbi Key 缓存 ----

let cachedImgKey = "";
let cachedSubKey = "";
let wbiKeyExpireAt = 0;

async function getWbiKeys(
  forceRefresh = false,
): Promise<{ imgKey: string; subKey: string }> {
  const now = Date.now();
  if (!forceRefresh && cachedImgKey && cachedSubKey && now < wbiKeyExpireAt) {
    return { imgKey: cachedImgKey, subKey: cachedSubKey };
  }

  const resp = await fetch(`${API_BASE}/x/web-interface/nav`, {
    headers: buildHeaders(),
  });
  const json = (await resp.json()) as {
    data: { wbi_img: { img_url: string; sub_url: string } };
  };

  const imgUrl = json.data.wbi_img.img_url;
  const subUrl = json.data.wbi_img.sub_url;

  cachedImgKey = imgUrl.slice(
    imgUrl.lastIndexOf("/") + 1,
    imgUrl.lastIndexOf("."),
  );
  cachedSubKey = subUrl.slice(
    subUrl.lastIndexOf("/") + 1,
    subUrl.lastIndexOf("."),
  );
  wbiKeyExpireAt = now + 5 * 60 * 1000; // 缓存 5 分钟

  return { imgKey: cachedImgKey, subKey: cachedSubKey };
}

// ---- Cookie 管理 ----

const ENV_PATH = resolve(import.meta.dir, "../../.env");

let currentSessdata = process.env.BILIBILI_SESSDATA ?? "";
let currentBiliJct = process.env.BILIBILI_BILI_JCT ?? "";
const currentRefreshToken = process.env.BILIBILI_REFRESH_TOKEN ?? "";

function getCookies(): string {
  const parts: string[] = [];
  if (currentSessdata) parts.push(`SESSDATA=${currentSessdata}`);
  if (currentBiliJct) parts.push(`bili_jct=${currentBiliJct}`);
  return parts.join("; ");
}

function buildHeaders(): Record<string, string> {
  const cookie = getCookies();
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Referer: REFERER,
  };
  if (cookie) headers["Cookie"] = cookie;
  return headers;
}

/** 从 Set-Cookie 响应头中提取指定 cookie 的值 */
function extractCookie(setCookieHeaders: string[], name: string): string {
  // Set-Cookie 格式: "name=value; Domain=...; Path=/; ..."
  // 匹配 ^name=value（首条）或 ; name=value（后续）
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`);
  for (const header of setCookieHeaders) {
    const match = header.match(re);
    if (match) return match[1];
  }
  return "";
}

/** 将新 cookie 写入 .env 文件持久化 */
function persistCookies(
  sessdata: string,
  biliJct: string,
  refreshToken: string,
) {
  let envContent = "";
  if (existsSync(ENV_PATH)) {
    envContent = readFileSync(ENV_PATH, "utf-8");
  }

  const update = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    return regex.test(content)
      ? content.replace(regex, line)
      : `${content.trimEnd()}\n${line}\n`;
  };

  envContent = update(envContent, "BILIBILI_SESSDATA", sessdata);
  envContent = update(envContent, "BILIBILI_BILI_JCT", biliJct);
  envContent = update(envContent, "BILIBILI_REFRESH_TOKEN", refreshToken);
  writeFileSync(ENV_PATH, `${envContent.trimEnd()}\n`, "utf-8");
}

/** 检查并刷新 Cookie */
async function refreshCookieIfNeeded(): Promise<boolean> {
  if (!currentSessdata || !currentRefreshToken) return false;

  try {
    // 1. 检查是否需要刷新
    let needsRefresh = false;

    const checkResp = await fetch(
      `${PASSPORT_BASE}/x/passport-login/web/cookie/info?csrf=${currentBiliJct}`,
      {
        headers: {
          Cookie: `SESSDATA=${currentSessdata}`,
          "User-Agent": USER_AGENT,
          Referer: REFERER,
        },
      },
    );

    const ct = checkResp.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const checkJson = (await checkResp.json()) as {
        code: number;
        data: { refresh: boolean; timestamp: number } | null;
      };

      if (checkJson.code === 0 && checkJson.data?.refresh) {
        needsRefresh = true;
        console.log("  🔄 Cookie 即将过期，正在刷新...");
      } else if (checkJson.code === -101) {
        // SESSDATA 已过期，强制刷新
        needsRefresh = true;
        console.log("  🔄 Cookie 已过期，正在刷新...");
      }
    }

    if (!needsRefresh) return false;

    // 2. 执行刷新
    const refreshResp = await fetch(
      `${PASSPORT_BASE}/x/passport-login/web/confirm/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `SESSDATA=${currentSessdata}; bili_jct=${currentBiliJct}`,
          "User-Agent": USER_AGENT,
          Referer: REFERER,
        },
        body: `csrf=${currentBiliJct}&refresh_token=${currentRefreshToken}`,
        redirect: "manual",
      },
    );

    // 3. 从 Set-Cookie 提取新值
    const setCookies = refreshResp.headers.getSetCookie();
    const newSessdata = extractCookie(setCookies, "SESSDATA");
    const newBiliJct = extractCookie(setCookies, "bili_jct");

    if (!newSessdata) {
      // 尝试从响应体获取错误信息
      try {
        const body = (await refreshResp.json()) as {
          code: number;
          message: string;
        };
        console.error(`  ⚠️ Cookie 刷新失败 (${body.code}): ${body.message}`);
      } catch {
        console.error("  ⚠️ Cookie 刷新失败：未获取到新 SESSDATA");
      }
      return false;
    }

    // 4. 更新内存 + 环境变量 + .env 文件
    currentSessdata = newSessdata;
    currentBiliJct = newBiliJct;
    process.env.BILIBILI_SESSDATA = newSessdata;
    process.env.BILIBILI_BILI_JCT = newBiliJct;

    persistCookies(newSessdata, newBiliJct, currentRefreshToken);
    console.log("  ✅ Cookie 已刷新并持久化到 .env");
    return true;
  } catch (err) {
    console.error(`  ⚠️ Cookie 刷新异常: ${(err as Error).message}`);
    return false;
  }
}

// ---- API 请求 ----

class BilibiliApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(`Bilibili API 错误 (${code}): ${message}`);
    this.name = "BilibiliApiError";
  }
}

async function apiGet<T>(
  path: string,
  params: Record<string, string>,
  refreshKeys = false,
): Promise<T> {
  const { imgKey, subKey } = await getWbiKeys(refreshKeys);
  const wbiSign = encWbi(params, imgKey, subKey);

  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("w_rid", wbiSign);
  url.searchParams.set("wts", Math.round(Date.now() / 1000).toString());

  const resp = await fetch(url.toString(), { headers: buildHeaders() });

  const contentType = resp.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new BilibiliApiError(resp.status, `非 JSON 响应 (${resp.status})`);
  }

  const json = (await resp.json()) as {
    code: number;
    message: string;
    data: T;
  };

  if (json.code !== 0) {
    throw new BilibiliApiError(json.code, json.message);
  }
  return json.data;
}

// ---- 视频列表接口 ----

interface BilibiliVideoItem {
  bvid: string;
  aid: number;
  title: string;
  pubdate: number;
  created?: number;
}

interface ArcSearchData {
  list: {
    vlist: BilibiliVideoItem[];
  };
  page: {
    pn: number;
    ps: number;
    count: number;
  };
}

/** 获取单页视频列表 */
function fetchPage(page: number, refreshKeys = false) {
  return apiGet<ArcSearchData>(
    "/x/space/wbi/arc/search",
    {
      mid: UID,
      ps: String(PAGE_SIZE),
      pn: String(page),
      order: "pubdate",
    },
    refreshKeys,
  );
}

/** 获取单页视频列表（带重试） */
async function fetchPageWithRetry(page: number): Promise<ArcSearchData> {
  const maxRetries = 5;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchPage(page, attempt > 1);
    } catch (err) {
      const isRetryable =
        err instanceof BilibiliApiError &&
        (err.code === -352 || err.code >= 500 || err.code === 412);

      if (!isRetryable || attempt === maxRetries) throw err;

      const delay = Math.min(attempt * 3000, 15000);
      console.error(
        `  ⚠️ 第 ${page} 页请求失败 (${attempt}/${maxRetries}): ${err.message}，${delay / 1000}s 后重试...`,
      );
      await sleep(delay);
    }
  }
  throw new Error("所有重试均失败");
}

/** 将 Bilibili 视频条目映射为 VideoEntry */
function mapToVideoEntry(v: BilibiliVideoItem): VideoEntry {
  const created = v.created ?? v.pubdate ?? 0;
  return {
    bvid: v.bvid ?? "",
    aid: v.aid ?? 0,
    title: v.title ?? "",
    created,
    createdDate: created
      ? new Date(created * 1000).toISOString().split("T")[0]
      : "",
  };
}

/** 通过官方 API 分页获取所有视频 */
export async function fetchAllVideos(): Promise<VideoEntry[]> {
  const hasCookie = !!currentSessdata;
  const hasRefreshToken = !!currentRefreshToken;
  console.log(`🚀 开始通过官方 API 获取博主 ${UID} 的视频列表...`);
  if (hasCookie) {
    console.log("  🔑 使用 Cookie 鉴权");
    if (hasRefreshToken) await refreshCookieIfNeeded();
  } else {
    console.log("  ⚠️ 未配置 Cookie（仅公开数据可用）");
  }

  const firstPage = await fetchPageWithRetry(1);

  const totalCount = firstPage.page.count;
  const firstVideos = firstPage.list.vlist ?? [];

  const allVideos: VideoEntry[] = firstVideos.map(mapToVideoEntry);
  console.log(`  ✅ 第 1 页: ${firstVideos.length} 个视频`);

  let page = 2;
  while (allVideos.length < totalCount) {
    await sleep(2000);

    try {
      const pageData = await fetchPageWithRetry(page);
      const videos = pageData.list.vlist ?? [];
      if (videos.length === 0) break;
      allVideos.push(...videos.map(mapToVideoEntry));
      console.log(`  ✅ 第 ${page} 页: ${videos.length} 个视频`);
    } catch (err) {
      console.error(
        `  ❌ 第 ${page} 页失败: ${(err as Error)?.message ?? String(err)}`,
      );
      await sleep(5000);
    }

    page++;
  }

  if (allVideos.length < totalCount) {
    console.log(
      `\n📹 已收集 ${allVideos.length} 个视频标题（API 报告总数 ${totalCount}，差异来自已删除/私密/付费视频）\n`,
    );
  } else {
    console.log(`\n📹 已收集 ${allVideos.length} 个视频标题\n`);
  }
  return allVideos;
}
