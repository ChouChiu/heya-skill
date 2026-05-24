import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** 限速等待（毫秒） */
export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/** 从 .env 文件或环境变量读取 BILI_COOKIE */
export function loadEnv(): string {
  const envPath = join(import.meta.dir, "../../.env");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/BILI_COOKIE\s*=\s*"?([^"\n]+)"?/);
    if (match) return match[1].trim();
  }
  return "";
}

export const COOKIE = process.env.BILI_COOKIE || loadEnv();
