import type { AnalysisData, AnalysisResults, CategoryInfo } from "../types.ts";

/** 生成结构化分析 JSON */
export function generateJSON(r: AnalysisResults): AnalysisData {
  const {
    total,
    lengthStats,
    numberStats,
    topWords,
    categories,
    punctStats,
    emotionWords,
    aiTerms,
    aiDaily,
  } = r;

  return {
    meta: {
      creator: "黑鸦",
      uid: "3706929260006322",
      totalVideos: total,
      analysisDate: new Date().toISOString().split("T")[0],
    },
    patterns: {
      structure: Object.fromEntries(
        Object.entries(categories).map(([cat, catTitles]) => {
          const pct = catTitles.length / total;
          const info: CategoryInfo = {
            frequency: Math.round(pct * 1000) / 1000,
            count: catTitles.length,
            pctDisplay: `${(pct * 100).toFixed(1)}%`,
            examples: catTitles.slice(0, 5),
            templates: catTitles.slice(0, 3),
          };
          return [cat, info];
        }),
      ) as Record<string, CategoryInfo>,
    },
    keywords: {
      emotion: emotionWords
        .slice(0, 20)
        .map(([w, c]) => ({ word: w, count: c })),
      aiTerms: aiTerms.slice(0, 20).map(([w, c]) => ({ word: w, count: c })),
      highFrequency: topWords.map(([w, c]) => ({ word: w, count: c })),
      uniqueExpressions: emotionWords.filter(([, c]) => c >= 5).map(([w]) => w),
    },
    sentencePatterns: {
      question: Math.round((punctStats.endsQuestion / total) * 1000) / 1000,
      exclamation:
        Math.round((punctStats.endsExclamation / total) * 1000) / 1000,
      statement:
        Math.round(
          ((total - punctStats.endsQuestion - punctStats.endsExclamation) /
            total) *
            1000,
        ) / 1000,
    },
    length: {
      avg: parseFloat(lengthStats.avg),
      min: lengthStats.min,
      max: lengthStats.max,
      median: lengthStats.median,
      distribution: lengthStats.distribution,
      over40Pct:
        Math.round((lengthStats.distribution["40字以上"] / total) * 1000) / 10,
      optimal: { min: 31, max: 60 },
    },
    numbers: {
      withNumberPct: parseFloat(numberStats.withNumberPct),
      commonNumbers: numberStats.commonNumbers.map(([n, c]) => ({
        number: parseInt(n, 10),
        count: c,
      })),
    },
    punctuation: {
      exclamationEnd:
        Math.round((punctStats.endsExclamation / total) * 1000) / 1000,
      questionEnd: Math.round((punctStats.endsQuestion / total) * 1000) / 1000,
      ellipsisEnd: Math.round((punctStats.endsEllipsis / total) * 1000) / 1000,
    },
    aiDaily: {
      count: aiDaily.withAIDaily,
      pct: parseFloat(aiDaily.withAIDailyPct),
    },
  };
}
