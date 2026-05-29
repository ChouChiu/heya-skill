import { tag } from "jieba-wasm";
import {
  AI_TERM_PATTERN,
  EMOTION_PATTERN,
  POS_RULES,
  STOP_WORDS,
} from "./rules.ts";

const EMOTION_REGEX = new RegExp(EMOTION_PATTERN.source, "g");
const AI_TERM_REGEX = new RegExp(AI_TERM_PATTERN.source, "g");

/** 提取情绪词（静态词表匹配） */
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

/**
 * 动态情绪词发现：用 POS 标注从语料中自动提取高频形容词/动词
 * 排除静态词表中已有的词，发现新的情绪表达
 */
export function extractDynamicEmotion(
  titles: string[],
  topN = 20,
): [string, number][] {
  const counts: Record<string, number> = {};

  for (const title of titles) {
    const tokens = tag(title);
    for (const t of tokens) {
      if (
        (POS_RULES.emotion.includes(t.tag) ||
          POS_RULES.action.includes(t.tag)) &&
        t.word.trim().length >= 2 &&
        !EMOTION_PATTERN.test(t.word) &&
        !STOP_WORDS.has(t.word)
      ) {
        counts[t.word] = (counts[t.word] || 0) + 1;
      }
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

// ---- 实体消歧规则 ----

// 非实体词黑名单（jieba 可能误判为 nr/nz/eng 的词）
const ENTITY_BLACKLIST = new Set([
  "史诗",
  "龙虾",
  "小龙虾",
  "龙王",
  "王登基",
  "荣光",
  "文明",
  "许可",
  "伯格",
  "全线",
  "突围",
  "见证",
  "计划",
  "计划有变",
  "命运",
  "大地震",
  "雪崩",
  "海啸",
  "核弹",
  "神话",
  "硝烟",
  "斩杀线",
  "白热化",
  "沸腾",
  "哀嚎",
  "颤栗",
  "窒息",
  "尖叫",
  "瘫坐",
  "杀疯了",
  "疯狂",
  "疯了",
  "血腥",
  "逆天",
  "炸裂",
  "离谱",
  "V4",
  "V9",
  "Agent",
  "Token",
  "tokens",
  // 不应归为产品的词
  "AI日报",
  "AI圈",
  "曝光",
  "大战",
  "模型",
  "战",
  "全线",
  "史诗级",
  "奇点",
  "潮流",
  "潮",
  "命运大转折",
  "载入史册",
  "集体判处死刑",
]);

// 已知公司名映射（合并变体）
const COMPANY_ALIASES: Record<string, string> = {
  Google: "Google",
  谷歌: "Google",
  OpenAI: "OpenAI",
  奥特曼: "OpenAI",
  Anthropic: "Anthropic",
  阿莫迪: "Anthropic",
  DeepSeek: "DeepSeek",
  梁文峰: "DeepSeek",
  Meta: "Meta",
  扎克伯格: "Meta",
  苹果: "Apple",
  Apple: "Apple",
  微软: "Microsoft",
  Microsoft: "Microsoft",
  马斯克: "xAI",
  xAI: "xAI",
  阿里: "阿里巴巴",
  阿里巴巴: "阿里巴巴",
  腾讯: "腾讯",
  字节: "字节跳动",
  字节跳动: "字节跳动",
  百度: "百度",
  小米: "小米",
  月之暗面: "月之暗面",
  智谱: "智谱",
  MiniMax: "MiniMax",
  阶跃星辰: "阶跃星辰",
  杨植麟: "月之暗面",
  HappyHorse: "字节跳动",
};

// 已知产品名映射
const PRODUCT_ALIASES: Record<string, string> = {
  GPT: "GPT",
  ChatGPT: "ChatGPT",
  Claude: "Claude",
  Gemini: "Gemini",
  豆包: "豆包",
  Kimi: "Kimi",
  Qwen: "Qwen",
  千问: "Qwen",
  混元: "混元",
  Grok: "Grok",
  Cursor: "Cursor",
  Codex: "Codex",
  Copilot: "Copilot",
  Llama: "Llama",
  Sora: "Sora",
  Gemma: "Gemma",
  Mistral: "Mistral",
  Spud: "Spud",
  Mythos: "Mythos",
  Sonnet: "Sonnet",
  Opus: "Opus",
};

// 人名（只有这些才归为人名）
const KNOWN_PEOPLE: Record<string, string> = {
  奥特曼: "Sam Altman",
  梁文峰: "梁文峰",
  杨植麟: "杨植麟",
  马斯克: "Elon Musk",
  扎克伯格: "Mark Zuckerberg",
};

/**
 * 命名实体提取：用 POS 标注提取公司名、产品名、人名
 * 含实体消歧：过滤黑名单，用已知映射归类
 */
export function extractEntities(
  titles: string[],
  topN = 15,
): {
  companies: [string, number][];
  products: [string, number][];
  people: [string, number][];
} {
  const companyCounts: Record<string, number> = {};
  const productCounts: Record<string, number> = {};
  const peopleCounts: Record<string, number> = {};

  for (const title of titles) {
    const tokens = tag(title);
    const seen = new Set<string>(); // 同一标题内去重

    for (const t of tokens) {
      const w = t.word.trim();
      if (w.length < 2) continue;
      if (ENTITY_BLACKLIST.has(w)) continue;

      // 人名（优先检查，因为人名也可能在公司映射中）
      if (t.tag === "nr" && KNOWN_PEOPLE[w]) {
        if (!seen.has(`p:${w}`)) {
          peopleCounts[w] = (peopleCounts[w] || 0) + 1;
          seen.add(`p:${w}`);
        }
        continue;
      }

      // 公司名（中文专名或已知别名）
      if (
        (t.tag === "nz" || t.tag === "nt" || t.tag === "nr") &&
        COMPANY_ALIASES[w]
      ) {
        const canonical = COMPANY_ALIASES[w];
        if (!seen.has(`c:${canonical}`)) {
          companyCounts[canonical] = (companyCounts[canonical] || 0) + 1;
          seen.add(`c:${canonical}`);
        }
        continue;
      }

      // 英文词 → 公司或产品
      if (t.tag === "eng") {
        // 跳过过短或纯数字版本号
        if (w.length <= 1 || /^[Vv]\d/.test(w)) continue;

        if (COMPANY_ALIASES[w]) {
          const canonical = COMPANY_ALIASES[w];
          if (!seen.has(`c:${canonical}`)) {
            companyCounts[canonical] = (companyCounts[canonical] || 0) + 1;
            seen.add(`c:${canonical}`);
          }
        } else if (PRODUCT_ALIASES[w]) {
          const canonical = PRODUCT_ALIASES[w];
          if (!seen.has(`p:${canonical}`)) {
            productCounts[canonical] = (productCounts[canonical] || 0) + 1;
            seen.add(`p:${canonical}`);
          }
        }
        continue;
      }

      // 其他中文专名 → 产品
      if (t.tag === "nz" && !ENTITY_BLACKLIST.has(w) && w.length >= 2) {
        if (!seen.has(`p:${w}`)) {
          productCounts[w] = (productCounts[w] || 0) + 1;
          seen.add(`p:${w}`);
        }
      }
    }
  }

  const sortAndSlice = (counts: Record<string, number>): [string, number][] =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

  return {
    companies: sortAndSlice(companyCounts),
    products: sortAndSlice(productCounts),
    people: sortAndSlice(peopleCounts),
  };
}
