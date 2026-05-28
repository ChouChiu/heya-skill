#!/usr/bin/env bun
/**
 * fetch-bilibili-titles.ts
 * 从 B站获取博主"黑鸦"的所有视频标题（通过官方 API）
 *
 * 用法:
 *   bun run scripts/fetch-bilibili-titles.ts
 *
 * 环境变量（可选，提供后可获取完整数据）:
 *   BILIBILI_SESSDATA      - Cookie 中的 SESSDATA
 *   BILIBILI_BILI_JCT      - Cookie 中的 bili_jct（CSRF token）
 *   BILIBILI_REFRESH_TOKEN - 用于自动刷新过期 Cookie
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchAllVideos } from "./lib/bilibili.ts";
import type { VideoEntry } from "./lib/types.ts";

const OUTPUT_DIR = join(import.meta.dir, "../references/research");
const TITLES_PATH = join(OUTPUT_DIR, "01-titles.json");

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("从B站获取博主「黑鸦」的所有视频标题（通过官方 API）\n");
    console.log("用法:");
    console.log("  bun run scripts/fetch-bilibili-titles.ts");
    console.log("\n环境变量:");
    console.log("  BILIBILI_SESSDATA       Cookie 中的 SESSDATA");
    console.log("  BILIBILI_BILI_JCT       Cookie 中的 bili_jct");
    console.log("  BILIBILI_REFRESH_TOKEN  用于自动刷新过期 Cookie");
    process.exit(0);
  }

  let results: VideoEntry[];
  try {
    results = await fetchAllVideos();
  } catch (err) {
    console.error(`\n❌ 获取失败: ${(err as Error).message}`);

    // 降级：如果有旧数据就用旧的，避免 pipeline 全崩
    if (existsSync(TITLES_PATH)) {
      const existing = JSON.parse(readFileSync(TITLES_PATH, "utf-8"));
      console.error(
        `⚠️  降级使用缓存数据（${existing.length} 条标题），可能不是最新`,
      );
      results = existing;
    } else {
      console.error("💥 无缓存数据可用，退出");
      process.exit(1);
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(TITLES_PATH, JSON.stringify(results, null, 2), "utf-8");

  console.log("\n✨ 完成！");
  console.log(`  📹 视频总数: ${results.length}`);
  console.log("  💾 数据已保存到 references/research/01-titles.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
