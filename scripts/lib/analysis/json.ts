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
    wordsByPOS,
    ngrams,
    structure,
    multiCategory,
    dynamicEmotion,
    entities,
    temporal,
    coOccurrences,
    extractedTemplates,
    emotionIntensity,
    tfidfTopWords,
    sentimentAnalysis,
    englishEntities,
  } = r;

  // 多标签分类统计
  const multiCategoryStats: Record<
    string,
    { pureCount: number; totalCount: number; pctDisplay: string }
  > = {};
  for (const [cat, matches] of Object.entries(multiCategory)) {
    const totalCount = matches.length;
    const pureCount = matches.filter((m) => m.score >= 0.5).length;
    multiCategoryStats[cat] = {
      pureCount,
      totalCount,
      pctDisplay: `${((totalCount / total) * 100).toFixed(1)}%`,
    };
  }

  // 情绪强度统计
  const intensityDist: Record<string, number> = {
    极强: 0,
    强烈: 0,
    中等: 0,
    轻微: 0,
    无: 0,
  };
  let totalIntensity = 0;
  for (const e of emotionIntensity) {
    intensityDist[e.level]++;
    totalIntensity += e.score;
  }

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
    // ---- 新增字段 ----
    wordsByPOS: {
      adjectives: wordsByPOS.adjectives.map(([w, c]) => ({
        word: w,
        count: c,
      })),
      verbs: wordsByPOS.verbs.map(([w, c]) => ({ word: w, count: c })),
      nouns: wordsByPOS.nouns.map(([w, c]) => ({ word: w, count: c })),
      english: wordsByPOS.english.map(([w, c]) => ({ word: w, count: c })),
    },
    ngrams: {
      bigrams: ngrams.bigrams.map((n) => ({ word: n.phrase, count: n.count })),
      trigrams: ngrams.trigrams.map((n) => ({
        word: n.phrase,
        count: n.count,
      })),
    },
    structure: {
      avgClauses: structure.avgClauses,
      separatorPatterns: structure.separatorPatterns,
      exclamationDensity: structure.exclamationDensity,
      formulaTemplates: structure.formulaTemplates,
      clauseDistribution: structure.clauseDistribution,
    },
    multiCategory: multiCategoryStats,
    dynamicEmotion: dynamicEmotion.map(([w, c]) => ({ word: w, count: c })),
    entities: {
      companies: entities.companies.map(([w, c]) => ({ word: w, count: c })),
      products: entities.products.map(([w, c]) => ({ word: w, count: c })),
      people: entities.people.map(([w, c]) => ({ word: w, count: c })),
    },
    temporal: temporal.length > 0 ? temporal : undefined,
    coOccurrences:
      coOccurrences.length > 0
        ? coOccurrences.map((c) => ({
            emotion: c.emotionWord,
            topics: c.topicWords.join("、"),
            count: c.count,
          }))
        : undefined,
    extractedTemplates:
      extractedTemplates.length > 0
        ? extractedTemplates.map((t) => ({
            template: t.template,
            count: t.count,
            examples: t.examples,
          }))
        : undefined,
    emotionIntensity:
      emotionIntensity.length > 0
        ? {
            avgScore: Math.round((totalIntensity / total) * 10) / 10,
            distribution: intensityDist,
            topIntense: emotionIntensity
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((e) => ({
                title: e.title.slice(0, 60),
                score: e.score,
                level: e.level,
              })),
          }
        : undefined,
    tfidf:
      tfidfTopWords.length > 0
        ? {
            topWords: tfidfTopWords.slice(0, 20).map((w) => ({
              word: w.word,
              tfidf: w.tfidf,
              freq: w.freq,
            })),
          }
        : undefined,
    sentimentAnalysis: sentimentAnalysis
      ? {
          avgScore: sentimentAnalysis.avgScore,
          distribution: sentimentAnalysis.distribution,
          topPositive: sentimentAnalysis.topPositive.map((p) => ({
            title: p.title.slice(0, 60),
            score: Math.round(p.score * 10) / 10,
          })),
          topNegative: sentimentAnalysis.topNegative.map((p) => ({
            title: p.title.slice(0, 60),
            score: Math.round(p.score * 10) / 10,
          })),
        }
      : undefined,
    englishEntities: englishEntities
      ? {
          organizations: englishEntities.organizations.map(([w, c]) => ({
            word: w,
            count: c,
          })),
          people: englishEntities.people.map(([w, c]) => ({
            word: w,
            count: c,
          })),
          places: englishEntities.places.map(([w, c]) => ({
            word: w,
            count: c,
          })),
          nouns: englishEntities.nouns.map(([w, c]) => ({
            word: w,
            count: c,
          })),
        }
      : undefined,
  };
}
