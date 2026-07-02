/**
 * @module
 *
 * Pipeline orchestrator — 3 phases: fetch → analyze → generate.
 *
 * Each phase can be skipped (reads cached data).
 * Dry‑run prints intent without side effects.
 */
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

/**
 * @param start - `Date.now()` at phase start.
 * @returns Elapsed seconds as a 1‑decimal string.
 */
function elapsed(start: number): string {
	return ((Date.now() - start) / 1000).toFixed(1);
}

/**
 * Map a CSV row (all strings) back to a typed {@link VideoEntry}.
 *
 * @param row - CSV row object.
 * @returns Typed video entry.
 */
function mapCSVToVideo(row: Record<string, string>): VideoEntry {
	return {
		aid: Number(row.aid ?? 0),
		bvid: row.bvid ?? "",
		title: row.title ?? "",
		created: Number(row.created ?? 0),
		createdDate: row.createdDate ?? "",
	};
}

/**
 * Map a {@link VideoEntry} to a flat object for CSV serialization.
 *
 * @param v - Typed video entry.
 * @returns Flat row object.
 */
function videoToCSVRow(v: VideoEntry): Record<string, string | number> {
	return {
		aid: v.aid,
		bvid: v.bvid,
		title: v.title,
		created: v.created,
		createdDate: v.createdDate,
	};
}

/**
 * Run the full pipeline: fetch → analyze → generate.
 *
 * @param args - CLI args (unparsed).
 */
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
	const totalSteps = 3;

	// Phase 1: fetch titles from Bilibili API (or read cache)
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

	// Phase 2: analyze style (or read cache)
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

	// Phase 3: generate SKILL.md from template + analysis
	stepNum += 1;
	console.log(`[${stepNum}/${totalSteps}] 📝 Generate SKILL.md …`);
	const t0 = Date.now();
	const skill = generateSkill(analysis);
	writeTextFile(skillPath, skill);
	console.log(`  ✅ SKILL.md (${skill.length} chars, ${elapsed(t0)}s)\n`);

	// Print final file paths for manual inspection
	console.log(`✨ Done (${elapsed(totalStart)}s)`);
	console.log(`   📊 titles: ${titlesPath}`);
	console.log(`   📊 analysis: ${analysisDataPath}`);
	console.log(`   📊 report: ${analysisReportPath}`);
	console.log(`   📝 skill: ${skillPath}`);
}
