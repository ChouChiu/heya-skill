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
