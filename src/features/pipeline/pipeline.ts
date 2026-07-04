/**
 * @module
 *
 * Pipeline orchestrator — 3 phases: fetch → analyze → generate.
 *
 * Each phase can be skipped (reads cached data).
 * Dry‑run prints intent without side effects.
 */
import { UapiClient } from "uapi-sdk-typescript";
import {
	readCSV,
	readYamlFile,
	writeCSV,
	writeJsonFile,
	writeTextFile,
	writeYamlFile,
} from "../../shared/files.ts";
import {
	analysisDataPath,
	analysisReportPath,
	llmBriefPath,
	skillPath,
	titleFeaturesPath,
	titlesPath,
} from "../../shared/paths.ts";
import { generateSkill } from "../skill-generation/generate-skill.ts";
import { analyzeStyle } from "../style-analysis/analyze.ts";
import { HanlpBackend } from "../style-analysis/nlp.ts";
import {
	renderAnalysisReport,
	renderLlmBrief,
} from "../style-analysis/report.ts";
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
			options.skipFetch
				? "  📋 fetch: skipped"
				: "  📋 fetch: UApi Bilibili proxy",
		);
		console.log(
			options.skipAnalyze
				? "  📋 analyze: skipped"
				: `  📋 analyze: ${options.nlpBackend} lexical analysis`,
		);
		console.log("  📋 generate: SKILL.md");
		return;
	}

	console.log("🚀 Pipeline start\n");
	const totalStart = Date.now();
	let stepNum = 0;
	const totalSteps = 3;

	// Phase 1: fetch titles from UApi Bilibili proxy (or read cache)
	let videos: VideoEntry[];
	if (options.skipFetch) {
		stepNum += 1;
		console.log(`[${stepNum}/${totalSteps}] 📥 Load titles from cache …`);
		videos = readCSV(titlesPath).map(mapCSVToVideo);
		console.log(`  ✅ ${videos.length} titles loaded\n`);
	} else {
		stepNum += 1;
		console.log(
			`[${stepNum}/${totalSteps}] 📥 Fetch titles via UApi (mid=${options.mid}) …`,
		);
		const t0 = Date.now();
		const client = new UapiClient(options.uapiBaseUrl, options.uapiApiKey);
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
		writeTextFile(llmBriefPath, renderLlmBrief(analysis));
		console.log(`  ✅ ${analysis.corpus.totalTitles} videos analyzed\n`);
	} else {
		stepNum += 1;
		console.log(`[${stepNum}/${totalSteps}] 📊 Analyze style via HanLP …`);
		const t0 = Date.now();
		const backend = new HanlpBackend({
			url: options.hanlpUrl,
			timeoutMs: options.hanlpTimeoutMs,
		});
		await backend.checkHealth();
		const result = await analyzeStyle(videos, {
			uid: options.mid,
			backend,
			batchSize: options.hanlpBatchSize,
		});
		analysis = result.analysis;
		writeYamlFile(analysisDataPath, analysis);
		writeJsonFile(titleFeaturesPath, result.features);
		writeTextFile(llmBriefPath, renderLlmBrief(analysis));
		writeTextFile(analysisReportPath, renderAnalysisReport(analysis));
		console.log(`  ✅ analysis complete (${elapsed(t0)}s)`);
		console.log(
			`     avg ${analysis.corpus.length.avg}字  |  entities ${analysis.entities.coveragePct}%  |  ! ${analysis.rhetoric.exclamationPct}%  |  ? ${analysis.rhetoric.questionPct}%`,
		);
		const topKw = analysis.lexicon.highFrequency
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
	console.log(`   📊 brief: ${llmBriefPath}`);
	console.log(`   📊 analysis: ${analysisDataPath}`);
	console.log(`   📊 report: ${analysisReportPath}`);
	console.log(`   📊 features: ${titleFeaturesPath}`);
	console.log(`   📝 skill: ${skillPath}`);
}
