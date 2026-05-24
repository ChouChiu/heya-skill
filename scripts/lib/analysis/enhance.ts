import { AI_TERM_PATTERN, EMOTION_PATTERN } from "./rules.ts";

const EMOTION_REGEX = new RegExp(EMOTION_PATTERN.source, "g");
const AI_TERM_REGEX = new RegExp(AI_TERM_PATTERN.source, "g");

/** 提取情绪词 */
export function extractEmotionWords(titles: string[]): [string, number][] {
  const counts: Record<string, number> = {};
  for (const t of titles) {
    const matches = t.match(EMOTION_REGEX) || [];
    for (const m of matches) {
      counts[m] = (counts[m] || 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/** 提取 AI 领域词 */
export function extractAITerms(titles: string[]): [string, number][] {
  const counts: Record<string, number> = {};
  for (const t of titles) {
    const matches = t.match(AI_TERM_REGEX) || [];
    for (const m of matches) {
      counts[m] = (counts[m] || 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/** 分析 AI 日报格式 */
export function analyzeAIDailyFormat(titles: string[]) {
  const withAI = titles.filter((t) => /AI日报|AI 日报/.test(t));
  return {
    withAIDaily: withAI.length,
    withAIDailyPct: ((withAI.length / titles.length) * 100).toFixed(1),
  };
}
