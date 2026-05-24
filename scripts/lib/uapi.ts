/**
 * uapi.ts — UAPI (uapis.cn) B站数据采集客户端
 * 通过 uapi-sdk-typescript SDK 调用官方聚合 API，零配置，无需 Cookie/签名
 *
 * 环境变量（全部可选）:
 *   UAPI_API_KEY            - UAPI API Key（不提供则使用免费访客积分）
 */

import { UapiClient } from "uapi-sdk-typescript";
import type { VideoEntry } from "./types.ts";
import { sleep } from "./utils.ts";

// B站 UID（mid）
export const UID = "3706929260006322";

const API_BASE = "https://uapis.cn";
const PAGE_SIZE = 50;
const MAX_RETRIES = 5;

function createClient(): UapiClient {
  const apiKey = process.env.UAPI_API_KEY ?? "";
  return new UapiClient(API_BASE, apiKey);
}

/** 获取单页视频列表 */
async function fetchPage(
  client: UapiClient,
  page: number,
): Promise<{
  total: number;
  videos: VideoEntry[];
}> {
  const data = await client.social.getSocialBilibiliArchives({
    mid: UID,
    orderby: "pubdate",
    ps: String(PAGE_SIZE),
    pn: String(page),
  });

  const videos: VideoEntry[] = (data.videos ?? []).map((v) => {
    const created = v.publish_time ?? v.create_time ?? 0;
    return {
      bvid: v.bvid ?? "",
      aid: v.aid ?? 0,
      title: v.title ?? "",
      created,
      createdDate: created
        ? new Date(created * 1000).toISOString().split("T")[0]
        : "",
    };
  });

  return {
    total: data.total ?? 0,
    videos,
  };
}

/** 获取单页视频列表（带重试） */
async function fetchPageWithRetry(
  client: UapiClient,
  page: number,
): Promise<{ total: number; videos: VideoEntry[] }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchPage(client, page);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isRetryable =
        message.includes("429") ||
        message.includes("503") ||
        message.includes("ServiceBusy") ||
        message.includes("timeout") ||
        message.includes("ECONNRESET") ||
        message.includes("ETIMEDOUT");

      if (!isRetryable || attempt === MAX_RETRIES) throw err;

      const delay = Math.min(attempt * 3000, 15000);
      console.error(
        `  ⚠️ 第 ${page} 页请求失败 (${attempt}/${MAX_RETRIES}): ${message}，${delay / 1000}s 后重试...`,
      );
      await sleep(delay);
    }
  }
  throw new Error("所有重试均失败");
}

/** 通过 UAPI 分页获取所有视频 */
export async function fetchAllVideos(): Promise<VideoEntry[]> {
  console.log(`🚀 开始通过 UAPI 获取博主 ${UID} 的视频列表...`);

  const client = createClient();

  const firstResult = await fetchPageWithRetry(client, 1);
  const totalCount = firstResult.total;
  const allVideos: VideoEntry[] = [...firstResult.videos];

  console.log(
    `  ✅ 第 1 页: ${firstResult.videos.length} 个视频（总计 ${totalCount} 个）`,
  );

  let page = 2;
  while (allVideos.length < totalCount) {
    await sleep(1500); // 友好限速

    try {
      const result = await fetchPageWithRetry(client, page);
      if (result.videos.length === 0) break;
      allVideos.push(...result.videos);
      console.log(`  ✅ 第 ${page} 页: ${result.videos.length} 个视频`);
    } catch (err) {
      console.error(
        `  ❌ 第 ${page} 页失败: ${err instanceof Error ? err.message : String(err)}`,
      );
      await sleep(5000);
    }

    page++;
  }

  if (allVideos.length < totalCount) {
    console.log(
      `\n📹 已收集 ${allVideos.length} 个视频标题（API 报告总数 ${totalCount}，差异来自已删除/私密视频）\n`,
    );
  } else {
    console.log(`\n📹 已收集 ${allVideos.length} 个视频标题\n`);
  }
  return allVideos;
}
