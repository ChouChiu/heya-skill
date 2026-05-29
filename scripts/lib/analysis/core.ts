import { add_word, cut, tag } from "jieba-wasm";
import type {
  AnalysisResults,
  CategoryMatch,
  CoOccurrence,
  EmotionIntensityResult,
  ExtractedTemplate,
  NgramEntry,
  POSToken,
  StructureInfo,
  TemporalTrend,
  VideoEntry,
  WordsByPOS,
} from "../types.ts";
import {
  analyzeAIDailyFormat,
  extractAITerms,
  extractDynamicEmotion,
  extractEmotionWords,
  extractEntities,
} from "./enhance.ts";
import {
  analyzeSentimentAdvanced,
  analyzeTFIDFWithNatural,
  extractEnglishEntities,
} from "./nlp.ts";
import {
  CUSTOM_DICTIONARY,
  EMOTION_INTENSITY,
  EMOTION_PATTERN,
  POS_RULES,
  STOP_WORDS,
  TITLE_PATTERNS,
  TITLE_SEPARATORS,
} from "./rules.ts";

// ---- 初始化：注入自定义词典 ----

let dictLoaded = false;

function ensureDict(): void {
  if (dictLoaded) return;
  for (const [word, freq, tagStr] of CUSTOM_DICTIONARY) {
    add_word(word, freq, tagStr);
  }
  dictLoaded = true;
}

// ---- 中文分词 ----

/** 使用 jieba 分词，返回过滤停用词后的词汇列表（兼容旧接口） */
export function segmentChinese(text: string): string[] {
  ensureDict();
  const words = cut(text, true);
  return words.filter((w) => w.trim().length >= 2 && !STOP_WORDS.has(w));
}

/** 使用 jieba POS 标注分词，返回带词性的 token 列表 */
export function segmentWithPOS(text: string): POSToken[] {
  ensureDict();
  const tokens = tag(text);
  return tokens.filter(
    (t) =>
      t.word.trim().length >= 1 &&
      !STOP_WORDS.has(t.word) &&
      !POS_RULES.filter.includes(t.tag),
  );
}

/** 按 POS 分组提取词汇 */
export function groupByPOS(tokens: POSToken[]): {
  adjectives: string[];
  verbs: string[];
  nouns: string[];
  english: string[];
} {
  const adjectives: string[] = [];
  const verbs: string[] = [];
  const nouns: string[] = [];
  const english: string[] = [];

  for (const t of tokens) {
    if (POS_RULES.emotion.includes(t.tag)) adjectives.push(t.word);
    else if (POS_RULES.action.includes(t.tag)) verbs.push(t.word);
    else if (POS_RULES.entity.includes(t.tag)) nouns.push(t.word);
    else if (POS_RULES.english.includes(t.tag)) english.push(t.word);
  }

  return { adjectives, verbs, nouns, english };
}

// ---- N-gram 短语提取 ----

/** 过滤无意义的 N-gram */
function isValidNgram(words: string[]): boolean {
  // 至少有一个词长度 >= 2
  if (words.every((w) => w.length <= 1)) return false;

  // 不允许中间出现单字词（"AI" 等英文除外）
  for (let i = 1; i < words.length - 1; i++) {
    if (words[i].length <= 1 && !/^[A-Z]+$/i.test(words[i])) return false;
  }

  // 不允许首尾是单字词（英文除外）
  if (words[0].length <= 1 && !/^[A-Z]+$/i.test(words[0])) return false;
  if (
    words[words.length - 1].length <= 1 &&
    !/^[A-Z]+$/i.test(words[words.length - 1])
  )
    return false;

  // 不允许连续重复词（如 "战战"）
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1]) return false;
  }

  // 不允许全是标点/符号
  if (words.every((w) => /^[^\w\u4e00-\u9fff]+$/.test(w))) return false;

  // 不允许包含纯数字/版本号（如 "Qwen3.5" 中的 "3.5"）
  if (words.some((w) => /^\d+(\.\d+)*$/.test(w))) return false;

  // 短语总长度上限（避免拼接多个独立短语）
  const totalLen = words.join("").length;
  if (words.length === 2 && totalLen > 8) return false;
  if (words.length === 3 && totalLen > 6) return false;

  // 不允许包含常见的标题格式后缀（它们会和前面的短语拼接）
  const combined = words.join("");
  if (/AI日报|AI 日报/.test(combined) && words.length > 1) return false;

  return true;
}

/** 从分词结果中提取 N-gram 短语 */
export function extractNgrams(
  titles: string[],
  topN = 20,
): { bigrams: NgramEntry[]; trigrams: NgramEntry[] } {
  ensureDict();
  const bigramCounts: Record<string, number> = {};
  const trigramCounts: Record<string, number> = {};

  for (const title of titles) {
    const words = cut(title, true).filter(
      (w) => w.trim().length >= 1 && !STOP_WORDS.has(w),
    );

    // bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const pair = [words[i], words[i + 1]];
      if (isValidNgram(pair)) {
        const phrase = pair.join("");
        if (phrase.length >= 3) {
          bigramCounts[phrase] = (bigramCounts[phrase] || 0) + 1;
        }
      }
    }

    // trigrams
    for (let i = 0; i < words.length - 2; i++) {
      const triple = [words[i], words[i + 1], words[i + 2]];
      if (isValidNgram(triple)) {
        const phrase = triple.join("");
        if (phrase.length >= 4) {
          trigramCounts[phrase] = (trigramCounts[phrase] || 0) + 1;
        }
      }
    }
  }

  const sortAndSlice = (
    counts: Record<string, number>,
    minCount = 1,
  ): NgramEntry[] =>
    Object.entries(counts)
      .filter(([, c]) => c >= minCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([phrase, count]) => ({ phrase, count }));

  return {
    bigrams: sortAndSlice(bigramCounts),
    trigrams: sortAndSlice(trigramCounts, 2), // trigram 至少出现 2 次
  };
}

// ---- 按词性分类的高频词 ----

export function analyzeWordsByPOS(titles: string[], topN = 15): WordsByPOS {
  ensureDict();
  const adjCounts: Record<string, number> = {};
  const verbCounts: Record<string, number> = {};
  const nounCounts: Record<string, number> = {};
  const engCounts: Record<string, number> = {};

  for (const title of titles) {
    const tokens = segmentWithPOS(title);
    const groups = groupByPOS(tokens);

    for (const w of groups.adjectives) {
      if (w.length >= 2) adjCounts[w] = (adjCounts[w] || 0) + 1;
    }
    for (const w of groups.verbs) {
      if (w.length >= 2) verbCounts[w] = (verbCounts[w] || 0) + 1;
    }
    for (const w of groups.nouns) {
      if (w.length >= 2) nounCounts[w] = (nounCounts[w] || 0) + 1;
    }
    for (const w of groups.english) {
      if (w.length >= 2) engCounts[w] = (engCounts[w] || 0) + 1;
    }
  }

  const sortAndSlice = (counts: Record<string, number>): [string, number][] =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

  return {
    adjectives: sortAndSlice(adjCounts),
    verbs: sortAndSlice(verbCounts),
    nouns: sortAndSlice(nounCounts),
    english: sortAndSlice(engCounts),
  };
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

/** 分析高频词汇（兼容旧接口） */
export function analyzeWords(titles: string[], topN = 20): [string, number][] {
  const wordCounts: Record<string, number> = {};

  for (const title of titles) {
    const words = segmentChinese(title);
    for (const word of words) {
      if (word.length >= 2) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

// ---- 多标签加权分类 ----

/** 多标签加权分类：每个标题可属于多个分类，按匹配度打分 */
export function classifyTitlesMulti(
  titles: string[],
): Record<string, CategoryMatch[]> {
  const results: Record<string, CategoryMatch[]> = {};

  for (const title of titles) {
    const matches: CategoryMatch[] = [];

    for (const [cat, rules] of Object.entries(TITLE_PATTERNS)) {
      let score = 0;
      const matched: string[] = [];

      for (const { pattern, weight } of rules) {
        if (pattern.test(title)) {
          score += weight;
          matched.push(pattern.source.slice(0, 30));
        }
      }

      if (score > 0) {
        matches.push({ category: cat, score: Math.min(score, 1), matched });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    for (const m of matches) {
      if (!results[m.category]) results[m.category] = [];
      results[m.category].push(m);
    }

    if (matches.length === 0) {
      if (!results["其他"]) results["其他"] = [];
      results["其他"].push({ category: "其他", score: 1, matched: [] });
    }
  }

  return results;
}

/** 分类标题（兼容旧接口，返回 first-match 结果） */
export function classifyTitles(titles: string[]): Record<string, string[]> {
  const results: Record<string, string[]> = {};
  for (const cat of Object.keys(TITLE_PATTERNS)) {
    results[cat] = [];
  }
  results["其他"] = [];

  for (const title of titles) {
    let matched = false;
    for (const [cat, rules] of Object.entries(TITLE_PATTERNS)) {
      if (rules.some((r) => r.pattern.test(title))) {
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

// ---- 结构分析 ----

/** 分析标题结构：分句数、分隔符密度、公式模板 */
export function analyzeStructure(titles: string[]): StructureInfo {
  const clauseCounts: Record<string, number> = {};
  const separatorCounts: Record<string, number> = {};
  let totalClauses = 0;
  let totalExclamations = 0;
  const formulaCounts: Record<string, number> = {};

  for (const title of titles) {
    const clauses = title
      .split(/(?<=[!！。？?，|])/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    const clauseCount = clauses.length;
    totalClauses += clauseCount;

    const bucket =
      clauseCount <= 2
        ? "1-2句"
        : clauseCount <= 4
          ? "3-4句"
          : clauseCount <= 6
            ? "5-6句"
            : "7句以上";
    clauseCounts[bucket] = (clauseCounts[bucket] || 0) + 1;

    const exclCount = (title.match(/[!！]/g) || []).length;
    totalExclamations += exclCount;

    const seps = title.match(TITLE_SEPARATORS) || [];
    for (const sep of seps) {
      separatorCounts[sep] = (separatorCounts[sep] || 0) + 1;
    }

    if (/AI日报|AI 日报/.test(title)) {
      formulaCounts["{事件们} | AI日报{日期}"] =
        (formulaCounts["{事件们} | AI日报{日期}"] || 0) + 1;
    }
    if (/[!！].*[!！].*[!！]/.test(title)) {
      formulaCounts["{事件1}！{事件2}！{事件3}！"] =
        (formulaCounts["{事件1}！{事件2}！{事件3}！"] || 0) + 1;
    }
    if (/见证历史|官宣|重磅|震撼/.test(title) && /[!！]/.test(title)) {
      formulaCounts["{情绪词}！{主题}，{后果}！"] =
        (formulaCounts["{情绪词}！{主题}，{后果}！"] || 0) + 1;
    }
    if (/\?|？/.test(title)) {
      formulaCounts["{陈述}？{追问}"] =
        (formulaCounts["{陈述}？{追问}"] || 0) + 1;
    }
    if (/或|疑似|传|曝/.test(title) && !/[!！]/.test(title.slice(-1))) {
      formulaCounts["{传闻}，{推测}"] =
        (formulaCounts["{传闻}，{推测}"] || 0) + 1;
    }
  }

  const total = titles.length;

  return {
    avgClauses: Math.round((totalClauses / total) * 10) / 10,
    separatorPatterns: Object.fromEntries(
      Object.entries(separatorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    ),
    exclamationDensity: Math.round((totalExclamations / total) * 10) / 10,
    formulaTemplates: Object.entries(formulaCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, count]) => ({ pattern, count })),
    clauseDistribution: clauseCounts,
  };
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

// ---- 时间维度分析 ----

/** 分析风格随时间的演变趋势 */
export function analyzeTemporal(videos: VideoEntry[]): TemporalTrend[] {
  // 按月分组
  const byMonth: Record<string, VideoEntry[]> = {};
  for (const v of videos) {
    const month = v.createdDate.slice(0, 7); // "2026-05"
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(v);
  }

  const emotionRegex = new RegExp(EMOTION_PATTERN.source, "g");
  const trends: TemporalTrend[] = [];

  for (const [month, entries] of Object.entries(byMonth).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const titles = entries.map((e) => e.title);
    const lengths = titles.map((t) => t.length);
    const avgLength =
      Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) /
      10;

    const totalExcl = titles.reduce(
      (sum, t) => sum + (t.match(/[!！]/g) || []).length,
      0,
    );
    const exclamationDensity =
      Math.round((totalExcl / titles.length) * 10) / 10;

    // 情绪强度
    let totalIntensity = 0;
    const emotionCounts: Record<string, number> = {};
    for (const t of titles) {
      const matches = t.match(emotionRegex) || [];
      for (const m of matches) {
        emotionCounts[m] = (emotionCounts[m] || 0) + 1;
        totalIntensity += EMOTION_INTENSITY[m] || 1;
      }
    }
    const emotionIntensity =
      Math.round((totalIntensity / titles.length) * 10) / 10;

    const topEmotion =
      Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    trends.push({
      period: month,
      avgLength,
      exclamationDensity,
      emotionIntensity,
      topEmotion,
      titleCount: titles.length,
    });
  }

  return trends;
}

// ---- 共现分析 ----

/** 分析情绪词与主题词的搭配模式 */
export function analyzeCoOccurrence(
  videos: VideoEntry[],
  topN = 10,
): CoOccurrence[] {
  const emotionRegex = new RegExp(EMOTION_PATTERN.source, "g");
  const pairs: Record<string, Record<string, number>> = {};

  for (const v of videos) {
    const emotions = v.title.match(emotionRegex) || [];
    const tokens = segmentWithPOS(v.title);
    const topics = tokens
      .filter(
        (t) =>
          (POS_RULES.entity.includes(t.tag) ||
            POS_RULES.english.includes(t.tag)) &&
          t.word.length >= 2 &&
          !STOP_WORDS.has(t.word),
      )
      .map((t) => t.word);

    for (const e of emotions) {
      if (!pairs[e]) pairs[e] = {};
      for (const t of topics) {
        pairs[e][t] = (pairs[e][t] || 0) + 1;
      }
    }
  }

  const results: CoOccurrence[] = [];
  for (const [emotion, topics] of Object.entries(pairs)) {
    const sorted = Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (sorted.length > 0) {
      results.push({
        emotionWord: emotion,
        topicWords: sorted.map(([w]) => w),
        count: sorted.reduce((s, [, c]) => s + c, 0),
      });
    }
  }

  return results.sort((a, b) => b.count - a.count).slice(0, topN);
}

// ---- 公式模板挖掘 ----

/**
 * 从语料中自动提取结构化公式模板
 * 用占位符替换实体/情绪词，然后统计高频模板
 */
export function extractTemplates(
  titles: string[],
  topN = 8,
): ExtractedTemplate[] {
  const emotionRegex = new RegExp(EMOTION_PATTERN.source, "g");

  function abstractTitle(title: string): string {
    let s = title;
    // 替换情绪词
    s = s.replace(emotionRegex, "{情绪}");
    // 替换英文实体
    s = s.replace(/[A-Z][a-zA-Z0-9.+-]+/g, "{EN}");
    // 替换数字
    s = s.replace(/\d+/g, "{N}");
    // 替换 AI日报+日期
    s = s.replace(/AI\s*日报\s*\d*/g, "{日报}");
    // 标准化标点
    s = s.replace(/[!！]+/g, "！").replace(/[?？]+/g, "？");
    // 去除空格
    s = s.replace(/\s+/g, "");
    return s;
  }

  const templateCounts: Record<string, { count: number; examples: string[] }> =
    {};

  for (const title of titles) {
    const tmpl = abstractTitle(title);
    if (!templateCounts[tmpl]) {
      templateCounts[tmpl] = { count: 0, examples: [] };
    }
    templateCounts[tmpl].count++;
    if (templateCounts[tmpl].examples.length < 3) {
      templateCounts[tmpl].examples.push(title);
    }
  }

  return Object.entries(templateCounts)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN)
    .map(([template, { count, examples }]) => ({
      template,
      count,
      examples,
    }));
}

// ---- 情绪强度评分 ----

/** 给每个标题打情绪强度分 */
export function scoreEmotionIntensity(
  titles: string[],
): EmotionIntensityResult[] {
  const emotionRegex = new RegExp(EMOTION_PATTERN.source, "g");

  return titles.map((title) => {
    const matches = title.match(emotionRegex) || [];
    let score = 0;
    for (const m of matches) {
      score += EMOTION_INTENSITY[m] || 1;
    }

    // 感叹号加成
    const exclCount = (title.match(/[!！]/g) || []).length;
    score += exclCount * 0.5;

    const level: EmotionIntensityResult["level"] =
      score >= 10
        ? "极强"
        : score >= 6
          ? "强烈"
          : score >= 3
            ? "中等"
            : score >= 1
              ? "轻微"
              : "无";

    return { title, score, matchedWords: matches, level };
  });
}

// ---- 入口：传入 VideoEntry 支持时间分析 ----

/** 一次性运行所有分析（接受 VideoEntry 以支持时间维度） */
export function runAllAnalysisFromVideos(
  videos: VideoEntry[],
  topN = 30,
): AnalysisResults {
  const titles = videos.map((v) => v.title);
  const base = runAllAnalysis(titles, topN);

  // 使用 natural/sentiment/compromise 增强分析
  const sentimentResult = analyzeSentimentAdvanced(titles);
  const enEntities = extractEnglishEntities(titles);

  return {
    ...base,
    temporal: analyzeTemporal(videos),
    coOccurrences: analyzeCoOccurrence(videos, 10),
    extractedTemplates: extractTemplates(titles, 8),
    emotionIntensity: scoreEmotionIntensity(titles),
    tfidfTopWords: analyzeTFIDFWithNatural(titles, 30),
    sentimentAnalysis: sentimentResult,
    englishEntities: enEntities,
  };
}

/** 一次性运行所有分析（纯标题字符串，兼容旧接口） */
export function runAllAnalysis(titles: string[], topN = 30): AnalysisResults {
  const sentimentResult = analyzeSentimentAdvanced(titles);
  const enEntities = extractEnglishEntities(titles);

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
    wordsByPOS: analyzeWordsByPOS(titles, 15),
    ngrams: extractNgrams(titles, 20),
    structure: analyzeStructure(titles),
    multiCategory: classifyTitlesMulti(titles),
    dynamicEmotion: extractDynamicEmotion(titles, 20),
    entities: extractEntities(titles, 15),
    temporal: [],
    coOccurrences: [],
    extractedTemplates: extractTemplates(titles, 8),
    emotionIntensity: scoreEmotionIntensity(titles),
    tfidfTopWords: analyzeTFIDFWithNatural(titles, 30),
    sentimentAnalysis: sentimentResult,
    englishEntities: enEntities,
  };
}
