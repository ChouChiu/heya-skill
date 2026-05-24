#!/usr/bin/env bun
/**
 * analyze-titles.ts
 * 分析B站视频标题风格模式（中文版）
 *
 * 分析维度：
 *   - 标题长度分布
 *   - 数字使用频率
 *   - 高频词汇（jieba 中文分词）
 *   - 标题公式分类（悬念式/数字列表式/对比式/情感式/故事式/教程式）
 *   - 标点符号与格式模式
 *
 * 用法:
 *   bun run scripts/analyze-titles.ts
 *   bun run scripts/analyze-titles.ts --top 30
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runAllAnalysis } from "./lib/analysis/core.ts";
import { generateJSON } from "./lib/analysis/json.ts";
import { generateReport } from "./lib/analysis/report.ts";
import type { VideoEntry } from "./lib/types.ts";

/** 加载标题数据 */
function loadTitles(filepath: string): VideoEntry[] {
  if (!existsSync(filepath)) {
    console.error(`[ERROR] 文件不存在: ${filepath}`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(filepath, "utf-8")) as unknown;
  if (!Array.isArray(data) || data.length === 0) {
    console.error("[ERROR] 数据为空");
    process.exit(1);
  }

  return data as VideoEntry[];
}

function main(): void {
  const args = process.argv.slice(2);
  const topIdx = args.indexOf("--top");
  const topN = topIdx !== -1 ? parseInt(args[topIdx + 1], 10) || 20 : 20;

  const inputPath = join(
    import.meta.dir,
    "../references/research/01-titles.json",
  );
  const outputPath = join(
    import.meta.dir,
    "../references/research/02-style-analysis.md",
  );

  console.log("📊 加载标题数据...");
  const videos = loadTitles(inputPath);
  console.log(`  ✅ 共 ${videos.length} 个标题\n`);

  console.log("🔍 分析中...\n");
  const titleTexts = videos.map((t) => t.title);
  const results = runAllAnalysis(titleTexts, Math.max(topN, 30));
  const report = generateReport(results, topN);
  const jsonData = generateJSON(results);

  writeFileSync(outputPath, report, "utf-8");
  const jsonPath = join(
    import.meta.dir,
    "../references/research/02-style-analysis.json",
  );
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
  console.log(report);
  console.log(`\n💾 报告已保存到: ${outputPath}`);
  console.log(`💾 JSON 已保存到: ${jsonPath}`);
}

main();
