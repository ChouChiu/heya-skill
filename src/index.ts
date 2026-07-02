#!/usr/bin/env bun

import { runPipeline } from "./features/pipeline/pipeline.ts";

try {
  await runPipeline(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Pipeline failed: ${message}`);
  process.exit(1);
}
