/**
 * @module
 *
 * CLI option parsing for the pipeline.
 *
 * Flags: `--skip-fetch`, `--skip-analyze`, `--dry-run`, `--help`/`-h`.
 * Env vars: `UAPI_BASE_URL` (default `"https://uapis.cn"`),
 * `UAPI_API_KEY` (optional, free tier works without it),
 * `BILIBILI_MID` (default `"3706929260006322"`),
 * `BILIBILI_PAGE_SIZE` (default `30`),
 * `NLP_BACKEND` (default `hanlp`), `HANLP_URL`,
 * `HANLP_TIMEOUT_MS` (default `20000`), `HANLP_BATCH_SIZE` (default `32`).
 */
import { getIntegerEnv, getOptionalEnv } from "../../shared/env.ts";

export interface PipelineOptions {
	dryRun: boolean;
	skipFetch: boolean;
	skipAnalyze: boolean;
	uapiBaseUrl: string;
	uapiApiKey: string;
	mid: string;
	pageSize: number;
	nlpBackend: "hanlp";
	hanlpUrl: string;
	hanlpTimeoutMs: number;
	hanlpBatchSize: number;
}

/**
 * Parse CLI args into typed pipeline options.
 *
 * @param args - `process.argv.slice(2)`.
 * @returns Parsed options. Exits immediately on `--help`.
 */
export function parsePipelineOptions(args: string[]): PipelineOptions {
	const dryRun = args.includes("--dry-run");
	const skipFetch = args.includes("--skip-fetch");
	const skipAnalyze = args.includes("--skip-analyze");

	if (args.includes("--help") || args.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	const nlpBackend = getOptionalEnv("NLP_BACKEND") ?? "hanlp";
	if (nlpBackend !== "hanlp") {
		throw new Error(`Unsupported NLP_BACKEND: ${nlpBackend}`);
	}

	return {
		dryRun,
		skipFetch,
		skipAnalyze,
		uapiBaseUrl: getOptionalEnv("UAPI_BASE_URL") ?? "https://uapis.cn",
		uapiApiKey: getOptionalEnv("UAPI_API_KEY") ?? "",
		mid: getOptionalEnv("BILIBILI_MID") ?? "3706929260006322",
		pageSize: getIntegerEnv("BILIBILI_PAGE_SIZE", 30),
		nlpBackend,
		hanlpUrl: getOptionalEnv("HANLP_URL") ?? "http://127.0.0.1:8765",
		hanlpTimeoutMs: getIntegerEnv("HANLP_TIMEOUT_MS", 20000),
		hanlpBatchSize: getIntegerEnv("HANLP_BATCH_SIZE", 32),
	};
}

function printHelp(): void {
	console.log(
		"Usage: bun pipeline [--skip-fetch] [--skip-analyze] [--dry-run]",
	);
}
