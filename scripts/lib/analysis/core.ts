import { cut } from "jieba-wasm";
import type { AnalysisResults } from "../types.ts";
import {
  analyzeAIDailyFormat,
  extractAITerms,
  extractEmotionWords,
} from "./enhance.ts";
import { STOP_WORDS, TITLE_PATTERNS } from "./rules.ts";

// ---- 中文分词 ----

/** 使用 jieba 分词，返回过滤停用词后的词汇列表 */
export function segmentChinese(text: string): string[] {
  const words = cut(text, true); // HMM 模式识别新词
  return words.filter((w) => w.trim().length >= 2 && !STOP_WORDS.has(w));
}

// ---- 基础统计 ----

/** 分析标题长度 */
export function analyzeLength(titles: string[]) {
  const lengths = titles.map((t) => t.length);
  const sorted = [...lengths].sort((a, b) => a - b);
  const total = lengths.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const sum = lengths.reduce((a, b) => a + b, 0);

  const distribution = {
    "20字以内": 0,
    "21-30字": 0,
    "31-40字": 0,
    "40字以上": 0,
  };
  for (const l of lengths) {
    if (l <= 20) distribution["20字以内"]++;
    else if (l <= 30) distribution["21-30字"]++;
    else if (l <= 40) distribution["31-40字"]++;
    else distribution["40字以上"]++;
  }

  return {
    avg: (sum / total).toFixed(1),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median,
    distribution,
  };
}

/** 分析数字使用 */
export function analyzeNumbers(titles: string[]) {
  const withNumber = titles.filter((t) => /\d/.test(t));
  const numbersFound: number[] = [];

  for (const t of titles) {
    const matches = t.match(/\d+/g) || [];
    numbersFound.push(...matches.map(Number));
  }

  const numberCounts: Record<number, number> = {};
  for (const n of numbersFound) {
    numberCounts[n] = (numberCounts[n] || 0) + 1;
  }

  return {
    withNumberPct: ((withNumber.length / titles.length) * 100).toFixed(1),
    commonNumbers: Object.entries(numberCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, v]) => [k, v] as [string, number]),
  };
}

/** 分析高频词汇 */
export function analyzeWords(titles: string[], topN = 20): [string, number][] {
  const wordCounts: Record<string, number> = {};

  for (const title of titles) {
    const words = segmentChinese(title);
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

/** 分类标题 */
export function classifyTitles(titles: string[]): Record<string, string[]> {
  const results: Record<string, string[]> = {};
  for (const cat of Object.keys(TITLE_PATTERNS)) {
    results[cat] = [];
  }
  results["其他"] = [];

  for (const title of titles) {
    let matched = false;
    for (const [cat, patterns] of Object.entries(TITLE_PATTERNS)) {
      if (patterns.some((p) => p.test(title))) {
        results[cat].push(title);
        matched = true;
        break;
      }
    }
    if (!matched) {
      results["其他"].push(title);
    }
  }

  return results;
}

/** 分析标点符号 */
export function analyzePunctuation(titles: string[]) {
  return {
    endsQuestion: titles.filter((t) => /[?？]$/.test(t)).length,
    endsExclamation: titles.filter((t) => /[!！]$/.test(t)).length,
    endsEllipsis: titles.filter((t) => /\.\.\.$|…$/.test(t)).length,
    hasAngleBracket: titles.filter((t) => /[《》「」]/.test(t)).length,
    hasEmoji: titles.filter((t) => /[\u{1F600}-\u{1F9FF}]/u.test(t)).length,
  };
}

/** 一次性运行所有分析，返回预计算结果供 report / json 共用 */
export function runAllAnalysis(titles: string[], topN = 30): AnalysisResults {
  return {
    total: titles.length,
    lengthStats: analyzeLength(titles),
    numberStats: analyzeNumbers(titles),
    topWords: analyzeWords(titles, topN),
    categories: classifyTitles(titles),
    punctStats: analyzePunctuation(titles),
    emotionWords: extractEmotionWords(titles),
    aiTerms: extractAITerms(titles),
    aiDaily: analyzeAIDailyFormat(titles),
  };
}
