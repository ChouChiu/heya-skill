// ============================================================
// 共用类型定义 — 被 fetch-bilibili-titles / analyze-titles / update-skill 复用
// ============================================================

// ---- 视频条目（采集结果） ----

export interface VideoEntry {
  bvid: string;
  aid: number;
  title: string;
  created: number;
  createdDate: string;
}

// ---- Pipeline 步骤 ----

export interface PipelineStep {
  id: "fetch" | "analyze" | "update";
  script: string;
  label: string;
}

// ---- 分词结果（带词性） ----

export interface POSToken {
  word: string;
  tag: string;
}

// ---- N-gram 短语 ----

export interface NgramEntry {
  phrase: string;
  count: number;
}

// ---- 标题分类结果（多标签） ----

export interface CategoryMatch {
  category: string;
  score: number;
  matched: string[];
}

// ---- 结构分析 ----

export interface StructureInfo {
  avgClauses: number;
  separatorPatterns: Record<string, number>;
  exclamationDensity: number;
  formulaTemplates: { pattern: string; count: number }[];
  clauseDistribution: Record<string, number>;
}

// ---- 按词性分类的词汇 ----

export interface WordsByPOS {
  adjectives: [string, number][];
  verbs: [string, number][];
  nouns: [string, number][];
  english: [string, number][];
}

// ---- 时间维度分析 ----

export interface TemporalTrend {
  period: string;
  avgLength: number;
  exclamationDensity: number;
  emotionIntensity: number;
  topEmotion: string;
  titleCount: number;
}

// ---- 共现分析 ----

export interface CoOccurrence {
  emotionWord: string;
  topicWords: string[];
  count: number;
}

// ---- 公式模板挖掘 ----

export interface ExtractedTemplate {
  template: string;
  count: number;
  examples: string[];
  slotTypes: Record<string, string[]>;
}

// ---- 情绪强度 ----

export interface EmotionIntensityResult {
  title: string;
  score: number;
  matchedWords: string[];
  level: "极强" | "强烈" | "中等" | "轻微" | "无";
}

// ---- 分析输出 (02-style-analysis.json) ----

export interface CategoryInfo {
  frequency: number;
  count: number;
  pctDisplay: string;
  examples: string[];
  templates: string[];
}

export interface KeywordEntry {
  word: string;
  count: number;
}

export interface NumberEntry {
  number: number;
  count: number;
}

export interface AnalysisData {
  meta: {
    creator: string;
    uid: string;
    totalVideos: number;
    analysisDate: string;
  };
  patterns: {
    structure: Record<string, CategoryInfo>;
  };
  keywords: {
    emotion: KeywordEntry[];
    aiTerms: KeywordEntry[];
    highFrequency: KeywordEntry[];
    uniqueExpressions: string[];
  };
  sentencePatterns: {
    question: number;
    exclamation: number;
    statement: number;
  };
  length: {
    avg: number;
    min: number;
    max: number;
    median: number;
    distribution: Record<string, number>;
    over40Pct: number;
    optimal: { min: number; max: number };
  };
  numbers: {
    withNumberPct: number;
    commonNumbers: NumberEntry[];
  };
  punctuation: {
    exclamationEnd: number;
    questionEnd: number;
    ellipsisEnd: number;
  };
  aiDaily: {
    count: number;
    pct: number;
  };
  // ---- 新增字段（向后兼容） ----
  wordsByPOS?: {
    adjectives: KeywordEntry[];
    verbs: KeywordEntry[];
    nouns: KeywordEntry[];
    english: KeywordEntry[];
  };
  ngrams?: {
    bigrams: KeywordEntry[];
    trigrams: KeywordEntry[];
  };
  structure?: {
    avgClauses: number;
    separatorPatterns: Record<string, number>;
    exclamationDensity: number;
    formulaTemplates: { pattern: string; count: number }[];
    clauseDistribution: Record<string, number>;
  };
  multiCategory?: Record<
    string,
    { pureCount: number; totalCount: number; pctDisplay: string }
  >;
  dynamicEmotion?: KeywordEntry[];
  entities?: {
    companies: KeywordEntry[];
    products: KeywordEntry[];
    people: KeywordEntry[];
  };
  temporal?: TemporalTrend[];
  coOccurrences?: { emotion: string; topics: string; count: number }[];
  extractedTemplates?: {
    template: string;
    count: number;
    examples: string[];
  }[];
  emotionIntensity?: {
    avgScore: number;
    distribution: Record<string, number>;
    topIntense: { title: string; score: number; level: string }[];
  };
  tfidf?: {
    topWords: { word: string; tfidf: number; freq: number }[];
  };
  sentimentAnalysis?: {
    avgScore: number;
    distribution: Record<string, number>;
    topPositive: { title: string; score: number }[];
    topNegative: { title: string; score: number }[];
  };
  englishEntities?: {
    organizations: { word: string; count: number }[];
    people: { word: string; count: number }[];
    places: { word: string; count: number }[];
    nouns: { word: string; count: number }[];
  };
}

// ---- 标题条目（analyze 输入，VideoEntry 的 title 视图） ----

export interface TitleEntry {
  title: string;
}

// ---- 预计算分析结果（避免 report / json 重复计算） ----

export interface AnalysisResults {
  total: number;
  lengthStats: {
    avg: string;
    min: number;
    max: number;
    median: number;
    distribution: Record<string, number>;
  };
  numberStats: {
    withNumberPct: string;
    commonNumbers: [string, number][];
  };
  topWords: [string, number][];
  categories: Record<string, string[]>;
  punctStats: {
    endsQuestion: number;
    endsExclamation: number;
    endsEllipsis: number;
    hasAngleBracket: number;
    hasEmoji: number;
  };
  emotionWords: [string, number][];
  aiTerms: [string, number][];
  aiDaily: {
    withAIDaily: number;
    withAIDailyPct: string;
  };
  // ---- 新增字段 ----
  wordsByPOS: WordsByPOS;
  ngrams: {
    bigrams: NgramEntry[];
    trigrams: NgramEntry[];
  };
  structure: StructureInfo;
  multiCategory: Record<string, CategoryMatch[]>;
  dynamicEmotion: [string, number][];
  entities: {
    companies: [string, number][];
    products: [string, number][];
    people: [string, number][];
  };
  // ---- 第二轮新增 ----
  temporal: TemporalTrend[];
  coOccurrences: CoOccurrence[];
  extractedTemplates: ExtractedTemplate[];
  emotionIntensity: EmotionIntensityResult[];
  tfidfTopWords: { word: string; tfidf: number; freq: number }[];
  // ---- 第三轮新增（natural/sentiment/compromise）----
  sentimentAnalysis?: {
    avgScore: number;
    distribution: Record<string, number>;
    topPositive: { title: string; score: number }[];
    topNegative: { title: string; score: number }[];
  };
  englishEntities?: {
    organizations: [string, number][];
    people: [string, number][];
    places: [string, number][];
    nouns: [string, number][];
  };
}
