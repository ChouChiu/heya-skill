#!/usr/bin/env bun

/**
 * @module
 *
 * Entry point for the Bilibili style analysis pipeline.
 *
 * ```sh
 * bun pipeline [--skip-fetch] [--skip-analyze] [--dry-run]
 * ```
 *
 * Requires {@link https://api.bilibili.com | `BILIBILI_COOKIE`} env var
 * unless `--dry-run` or `--skip-fetch` is set.
 */
import { runPipeline } from "./features/pipeline/pipeline.ts";

try {
	await runPipeline(process.argv.slice(2));
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`Pipeline failed: ${message}`);
	process.exit(1);
}
