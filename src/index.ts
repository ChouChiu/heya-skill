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
 * Uses the UApi proxy API (`/social/bilibili/archives`) — no Bilibili
 * cookie or WBI signing needed. Free tier works without an API key.
 */
import { runPipeline } from "./features/pipeline/pipeline.ts";

try {
	await runPipeline(process.argv.slice(2));
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`Pipeline failed: ${message}`);
	process.exit(1);
}
