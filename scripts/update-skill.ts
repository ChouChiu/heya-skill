#!/usr/bin/env bun
/**
 * update-skill.ts
 * 读取 02-style-analysis.json + SKILL.example.md 模板，生成 SKILL.md
 *
 * 用法:
 *   bun run scripts/update-skill.ts
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { genCoreFeatures } from "./lib/generate/core-features.ts";
import { genEmotionGuide } from "./lib/generate/emotion-guide.ts";
import { genStructureFormulas } from "./lib/generate/structure-formulas.ts";
import { genStyleInsights } from "./lib/generate/style-insights.ts";
import { genTitleExamples } from "./lib/generate/title-examples.ts";
import { genVocabLibrary } from "./lib/generate/vocab-library.ts";
import type { AnalysisData } from "./lib/types.ts";

const JSON_PATH = join(
  import.meta.dir,
  "../references/research/02-style-analysis.json",
);
const SKILL_SRC = join(import.meta.dir, "../SKILL.example.md");
const SKILL_OUT = join(import.meta.dir, "../SKILL.md");

/** 加载分析数据 */
function loadAnalysis(): AnalysisData {
  if (!existsSync(JSON_PATH)) {
    console.error("[ERROR] 分析数据不存在，请先运行 analyze-titles.ts");
    process.exit(1);
  }
  return JSON.parse(readFileSync(JSON_PATH, "utf-8")) as AnalysisData;
}

/** 加载 SKILL.example.md 模板 */
function loadSkill(): string {
  if (!existsSync(SKILL_SRC)) {
    console.error("[ERROR] SKILL.example.md 模板不存在");
    process.exit(1);
  }
  return readFileSync(SKILL_SRC, "utf-8");
}

/** 替换 AUTO_START/AUTO_END 标记区域内容 */
function replaceSection(
  content: string,
  sectionName: string,
  newContent: string,
): string {
  const startMarker = `<!-- AUTO_START:${sectionName} -->`;
  const endMarker = `<!-- AUTO_END:${sectionName} -->`;

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.warn(`  ⚠️ 未找到标记 ${sectionName}，跳过`);
    return content;
  }

  const before = content.slice(0, startIdx + startMarker.length);
  const after = content.slice(endIdx);
  return `${before}\n${newContent}\n${after}`;
}

function main(): void {
  console.log("📊 加载分析数据...");
  const data = loadAnalysis();
  console.log(`  ✅ 共 ${data.meta.totalVideos} 个视频的分析数据\n`);

  console.log("📝 加载 SKILL.example.md 模板...");
  let skill = loadSkill();

  console.log("🔄 更新数据段落...\n");

  skill = replaceSection(skill, "core-features", genCoreFeatures(data));
  console.log("  ✅ 核心特征");

  skill = replaceSection(skill, "title-examples", genTitleExamples(data));
  console.log("  ✅ 真实标题示例");

  skill = replaceSection(skill, "vocab-library", genVocabLibrary(data));
  console.log("  ✅ 高频词汇库");

  skill = replaceSection(
    skill,
    "structure-formulas",
    genStructureFormulas(data),
  );
  console.log("  ✅ 结构公式与分类占比");

  skill = replaceSection(skill, "emotion-guide", genEmotionGuide(data));
  console.log("  ✅ 情绪词使用指南");

  skill = replaceSection(skill, "style-insights", genStyleInsights(data));
  console.log("  ✅ 风格洞察");

  writeFileSync(SKILL_OUT, skill, "utf-8");
  console.log("\n💾 SKILL.md 已生成（模板 SKILL.example.md 未修改）");
}

main();
