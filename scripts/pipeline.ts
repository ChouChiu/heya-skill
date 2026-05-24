#!/usr/bin/env bun
/**
 * pipeline.ts
 * 一条龙：采集 → 分析 → 更新 SKILL.md
 *
 * 用法:
 *   bun pipeline                  # 全流程
 *   bun pipeline --skip-fetch     # 跳过采集，仅分析+更新
 *   bun pipeline --skip-analyze   # 跳过分析，仅更新 SKILL.md
 *   bun pipeline --dry-run        # 展示步骤，不实际执行
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import type { PipelineStep } from "./lib/types.ts";

const SCRIPTS_DIR = import.meta.dir;

const STEPS: PipelineStep[] = [
  { id: "fetch", script: "fetch-bilibili-titles.ts", label: "采集视频标题" },
  { id: "analyze", script: "analyze-titles.ts", label: "分析标题风格" },
  { id: "update", script: "update-skill.ts", label: "更新 SKILL.md" },
];

function runScript(scriptName: string, extraArgs: string[] = []): boolean {
  const scriptPath = join(SCRIPTS_DIR, scriptName);
  const result = spawnSync("bun", ["run", scriptPath, ...extraArgs], {
    cwd: join(SCRIPTS_DIR, ".."),
    stdio: "inherit",
    timeout: 600_000, // 10 minutes
  });

  if (result.error) {
    console.error(`❌ 执行失败: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    console.error(`❌ 退出码: ${result.status}`);
    return false;
  }

  return true;
}

function main(): void {
  const args = process.argv.slice(2);
  const skipFetch = args.includes("--skip-fetch");
  const skipAnalyze = args.includes("--skip-analyze");
  const dryRun = args.includes("--dry-run");

  if (args.includes("--help") || args.includes("-h")) {
    console.log("一条龙 pipeline：采集 → 分析 → 更新 SKILL.md\n");
    console.log("用法:");
    console.log("  bun pipeline                  # 全流程");
    console.log("  bun pipeline --skip-fetch     # 跳过采集");
    console.log("  bun pipeline --skip-analyze   # 跳过分析");
    console.log("  bun pipeline --dry-run        # 预览步骤");
    process.exit(0);
  }

  // 确定要执行的步骤
  const enabled = STEPS.filter((s) => {
    if (s.id === "fetch" && skipFetch) return false;
    if (s.id === "analyze" && skipAnalyze) return false;
    return true;
  });

  if (dryRun) {
    console.log("🔍 预览模式（不实际执行）\n");
    for (const s of enabled) {
      console.log(`  📋 ${s.label} → \`bun run scripts/${s.script}\``);
    }
    console.log(`\n  共 ${enabled.length} 个步骤`);
    process.exit(0);
  }

  console.log("🚀 一条龙 pipeline 启动\n");
  const startTime = Date.now();

  for (let i = 0; i < enabled.length; i++) {
    const step = enabled[i];
    console.log(`[${i + 1}/${enabled.length}] ${step.label}...`);
    console.log("─".repeat(40));

    const stepStart = Date.now();
    const ok = runScript(step.script);
    const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);

    if (!ok) {
      console.error(`\n❌ Pipeline 在「${step.label}」步骤失败`);
      process.exit(1);
    }

    console.log(`  ✅ 完成 (${elapsed}s)\n`);
  }

  const total = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("═".repeat(40));
  console.log(`✨ Pipeline 全部完成！总耗时 ${total}s`);
  console.log(`  📊 数据文件: references/research/01-titles.json`);
  console.log(`  📊 分析报告: references/research/02-style-analysis.md`);
  console.log(`  📊 分析 JSON: references/research/02-style-analysis.json`);
  console.log(`  📝 SKILL.md 已生成（模板 SKILL.example.md 未修改）`);
}

main();
