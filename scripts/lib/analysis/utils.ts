/**
 * utils.ts — 分析模块共享工具函数
 */

// ---- 排序切片 ----

/** 按频率降序排序并取 topN */
export function sortAndSlice(
  counts: Record<string, number>,
  topN = 20,
  minCount = 1,
): [string, number][] {
  return Object.entries(counts)
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

// ---- 情绪评分 ----

/** 情绪强度分档阈值 */
export const EMOTION_LEVELS: [number, string][] = [
  [10, "极强"],
  [6, "强烈"],
  [3, "中等"],
  [1, "轻微"],
  [0, "无"],
];

/** 根据分数返回情绪等级 */
export function classifyEmotionLevel(score: number): string {
  for (const [threshold, label] of EMOTION_LEVELS) {
    if (score >= threshold) return label;
  }
  return "无";
}

// ---- 常量 ----

/** 最小词长 */
export const MIN_WORD_LENGTH = 2;

/** AI日报正则 */
export const AI_DAILY_PATTERN = /AI日报|AI 日报/;
