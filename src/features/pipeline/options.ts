/**
 * @module
 *
 * CLI option parsing for the pipeline.
 *
 * Flags: `--skip-fetch`, `--skip-analyze`, `--dry-run`, `--help`/`-h`.
 * Env vars: `BILIBILI_COOKIE` (required unless skipped),
 * `BILIBILI_MID` (default `"3706929260006322"`),
 * `BILIBILI_PAGE_SIZE` (default `30`).
 */
import {
  getIntegerEnv,
  getOptionalEnv,
  getRequiredEnv,
} from "../../shared/env.ts";

export interface PipelineOptions {
  dryRun: boolean;
  skipFetch: boolean;
  skipAnalyze: boolean;
  cookie: string;
  mid: string;
  pageSize: number;
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

  return {
    dryRun,
    skipFetch,
    skipAnalyze,
    cookie: dryRun || skipFetch ? "" : getRequiredEnv("BILIBILI_COOKIE"),
    mid: getOptionalEnv("BILIBILI_MID") ?? "3706929260006322",
    pageSize: getIntegerEnv("BILIBILI_PAGE_SIZE", 30),
  };
}

function printHelp(): void {
  console.log(
    "Usage: bun pipeline [--skip-fetch] [--skip-analyze] [--dry-run]",
  );
}
