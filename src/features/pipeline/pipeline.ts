import {
  readCSV,
  readYamlFile,
  writeCSV,
  writeTextFile,
  writeYamlFile,
} from "../../shared/files.ts";
import {
  analysisDataPath,
  analysisReportPath,
  skillPath,
  titlesPath,
} from "../../shared/paths.ts";
import { BilibiliClient } from "../bilibili-api/client.ts";
import { generateSkill } from "../skill-generation/generate-skill.ts";
import { analyzeStyle } from "../style-analysis/analyze.ts";
import { renderAnalysisReport } from "../style-analysis/report.ts";
import type { StyleAnalysis } from "../style-analysis/types.ts";
import { fetchVideoTitles } from "../video-titles/fetch-video-titles.ts";
import type { VideoEntry } from "../video-titles/types.ts";
import { parsePipelineOptions } from "./options.ts";

function elapsed(start: number): string {
  return ((Date.now() - start) / 1000).toFixed(1);
}

function mapCSVToVideo(row: Record<string, string>): VideoEntry {
  return {
    aid: Number(row.aid ?? 0),
    bvid: row.bvid ?? "",
    title: row.title ?? "",
    created: Number(row.created ?? 0),
    createdDate: row.createdDate ?? "",
  };
}

function videoToCSVRow(v: VideoEntry): Record<string, string | number> {
  return {
    aid: v.aid,
    bvid: v.bvid,
    title: v.title,
    created: v.created,
    createdDate: v.createdDate,
  };
}

export async function runPipeline(args: string[]): Promise<void> {
  const options = parsePipelineOptions(args);

  if (options.dryRun) {
    console.log("🔍 Dry run (noop):");
    console.log(
      options.skipFetch ? "  📋 fetch: skipped" : "  📋 fetch: Bilibili API",
    );
    console.log(
      options.skipAnalyze
        ? "  📋 analyze: skipped"
        : "  📋 analyze: style stats",
    );
    console.log("  📋 generate: SKILL.md");
    return;
  }

  console.log("🚀 Pipeline start\n");
  const totalStart = Date.now();
  let stepNum = 0;
  const totalSteps = 3; // fetch, analyze, generate

  // ── fetch ──────────────────────────────────────────────────────────
  let videos: VideoEntry[];
  if (options.skipFetch) {
    stepNum += 1;
    console.log(`[${stepNum}/${totalSteps}] 📥 Load titles from cache …`);
    videos = readCSV(titlesPath).map(mapCSVToVideo);
    console.log(`  ✅ ${videos.length} titles loaded\n`);
  } else {
    stepNum += 1;
    console.log(
      `[${stepNum}/${totalSteps}] 📥 Fetch titles (mid=${options.mid}) …`,
    );
    const t0 = Date.now();
    const client = new BilibiliClient({ cookie: options.cookie });
    await client.getSpaceInfo(options.mid);
    videos = await fetchVideoTitles(client, {
      mid: options.mid,
      pageSize: options.pageSize,
    });
    writeCSV(titlesPath, videos.map(videoToCSVRow));
    console.log(
      `  ✅ ${videos.length} titles (${elapsed(t0)}s) → ${titlesPath}`,
    );
    for (const v of videos.slice(0, 3)) {
      console.log(`     [${v.createdDate}] ${v.title}`);
    }
    console.log("");
  }

  // ── analyze ────────────────────────────────────────────────────────
  let analysis: StyleAnalysis;
  if (options.skipAnalyze) {
    stepNum += 1;
    console.log(`[${stepNum}/${totalSteps}] 📊 Load analysis from cache …`);
    analysis = readYamlFile<StyleAnalysis>(analysisDataPath);
    console.log(`  ✅ ${analysis.meta.totalVideos} videos analyzed\n`);
  } else {
    stepNum += 1;
    console.log(`[${stepNum}/${totalSteps}] 📊 Analyze style …`);
    const t0 = Date.now();
    analysis = analyzeStyle(videos, options.mid);
    writeYamlFile(analysisDataPath, analysis);
    writeTextFile(analysisReportPath, renderAnalysisReport(analysis));
    console.log(`  ✅ analysis complete (${elapsed(t0)}s)`);
    console.log(
      `     avg ${analysis.length.avg}字  |  emotion ${analysis.emotion.avgScore.toFixed(2)}  |  ! ${analysis.rhetoric.exclamationPct}%  |  ? ${analysis.rhetoric.questionPct}%`,
    );
    const topKw = analysis.keywords.highFrequency
      .slice(0, 5)
      .map(([w]) => w)
      .join(" ");
    console.log(`     top: ${topKw}\n`);
  }

  // ── generate ───────────────────────────────────────────────────────
  stepNum += 1;
  console.log(`[${stepNum}/${totalSteps}] 📝 Generate SKILL.md …`);
  const t0 = Date.now();
  const skill = generateSkill(analysis);
  writeTextFile(skillPath, skill);
  console.log(`  ✅ SKILL.md (${skill.length} chars, ${elapsed(t0)}s)\n`);

  // ── summary ────────────────────────────────────────────────────────
  console.log(`✨ Done (${elapsed(totalStart)}s)`);
  console.log(`   📊 titles: ${titlesPath}`);
  console.log(`   📊 analysis: ${analysisDataPath}`);
  console.log(`   📊 report: ${analysisReportPath}`);
  console.log(`   📝 skill: ${skillPath}`);
}
