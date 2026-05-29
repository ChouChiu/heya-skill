/**
 * nlp.ts — 使用 natural / compromise / sentiment 增强分析
 */

import compromise from "compromise";
import natural from "natural";
import Sentiment from "sentiment";
import { segmentChinese } from "./core.ts";
import { EMOTION_INTENSITY, EMOTION_PATTERN } from "./rules.ts";

const sentiment = new Sentiment();

// ---- 中文情绪词典（扩展 AFINN）----
// 为 sentiment 库注入中文情绪词
const CHINESE_SENTIMENT_WORDS: Record<string, number> = {
  // 强烈正面
  杀疯了: 5,
  横空出世: 4,
  见证历史: 4,
  王炸: 4,
  史诗级: 4,
  震撼: 4,
  重磅: 4,
  炸裂: 4,
  逆天: 4,
  龙王归来: 4,
  核弹级: 5,
  奇点: 4,
  // 强烈负面
  大地震: -4,
  雪崩: -4,
  海啸: -4,
  神话破灭: -4,
  一夜蒸发: -4,
  集体判处死刑: -5,
  灭亡倒计时: -5,
  吓出癫痫: -4,
  瘫坐: -3,
  窒息: -3,
  尖叫: -3,
  颤抖: -3,
  冷汗直流: -3,
  眩晕: -3,
  后背发凉: -3,
  脊背发凉: -3,
  头皮发麻: -3,
  毛骨悚然: -3,
  血腥: -3,
  天崩地裂: -5,
  踢出群聊: -4,
  棺材板: -3,
  // 中等
  引爆: 3,
  全面: 2,
  永久: 2,
  无预警: 2,
  紧急: 2,
  官宣: 3,
  杀死: -3,
  斩杀: -3,
  绞杀: -3,
  围剿: -3,
  闪击: 3,
  沸腾: 3,
  哀嚎: -3,
  颤栗: -3,
  疯狂: 3,
  疯了: 3,
  白热化: 2,
  背水一战: 2,
  危机存亡: -3,
  // 轻度
  泄露: -2,
  曝光: -2,
  封号: -2,
  降价: 2,
  涨价: -2,
  免费: 3,
  收费: -2,
  开源: 2,
  闭源: -1,
};

// 将中文词注入 sentiment 库
for (const [word, score] of Object.entries(CHINESE_SENTIMENT_WORDS)) {
  sentiment.registerLanguage("zh", {
    labels: { [word]: score },
  });
}

// ---- natural TF-IDF 分析 ----

/**
 * 使用 natural 的 TF-IDF 实现
 * 比手写版本更健壮，支持 stemming 和 stop words
 */
export function analyzeTFIDFWithNatural(
  titles: string[],
  topN = 30,
): { word: string; tfidf: number; freq: number }[] {
  const tfidf = new natural.TfIdf();
  const wordFreq: Record<string, number> = {};
  const wordTfidfSum: Record<string, number> = {};
  const wordDocCount: Record<string, number> = {};

  for (const title of titles) {
    const words = segmentChinese(title).map((w) => w.toLowerCase());

    tfidf.addDocument(words.join(" "));

    for (const w of words) {
      if (w.length >= 2 && !/^\d+(\.\d+)*$/.test(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    }
  }

  // 收集每个词在所有文档中的 TF-IDF 分数
  for (let i = 0; i < titles.length; i++) {
    tfidf.listTerms(i).forEach((item) => {
      const word = item.term;
      if (word.length >= 2 && !/^\d+(\.\d+)*$/.test(word)) {
        wordTfidfSum[word] = (wordTfidfSum[word] || 0) + item.tfidf;
        wordDocCount[word] = (wordDocCount[word] || 0) + 1;
      }
    });
  }

  // 计算平均 TF-IDF，且要求至少出现在 2 个文档中
  const scores: { word: string; tfidf: number; freq: number }[] = [];
  for (const [word, sum] of Object.entries(wordTfidfSum)) {
    const docCount = wordDocCount[word] || 1;
    if (docCount >= 2 && wordFreq[word] >= 2) {
      scores.push({
        word,
        tfidf: Math.round((sum / docCount) * 1000) / 1000,
        freq: wordFreq[word],
      });
    }
  }

  return scores.sort((a, b) => b.tfidf - a.tfidf).slice(0, topN);
}

// ---- sentiment 情绪分析 ----

/**
 * 使用 sentiment 库的情绪分析
 * 结合 AFINN 英文词典和自定义中文词典
 */
export function analyzeSentimentAdvanced(titles: string[]): {
  avgScore: number;
  distribution: Record<string, number>;
  topPositive: { title: string; score: number }[];
  topNegative: { title: string; score: number }[];
} {
  const results: { title: string; score: number }[] = [];

  for (const title of titles) {
    // 先用 sentiment 分析英文部分
    const enResult = sentiment.analyze(title.toLowerCase());

    // 再用自定义中文词典分析
    let zhScore = 0;
    const emotionRegex = new RegExp(EMOTION_PATTERN.source, "g");

    const matches = title.match(emotionRegex) || [];
    for (const m of matches) {
      zhScore += EMOTION_INTENSITY[m] || 1;
    }

    // 感叹号加成
    const exclCount = (title.match(/[!！]/g) || []).length;
    zhScore += exclCount * 0.5;

    // 合并分数
    const totalScore = enResult.score + zhScore;
    results.push({ title, score: totalScore });
  }

  const dist: Record<string, number> = {
    极强: 0,
    强烈: 0,
    中等: 0,
    轻微: 0,
    无: 0,
  };
  for (const r of results) {
    if (r.score >= 10) dist["极强"]++;
    else if (r.score >= 6) dist["强烈"]++;
    else if (r.score >= 3) dist["中等"]++;
    else if (r.score >= 1) dist["轻微"]++;
    else dist["无"]++;
  }

  const avgScore =
    Math.round(
      (results.reduce((s, r) => s + r.score, 0) / results.length) * 10,
    ) / 10;

  const sorted = [...results].sort((a, b) => b.score - a.score);

  return {
    avgScore,
    distribution: dist,
    topPositive: sorted.slice(0, 5),
    topNegative: sorted.slice(-5).reverse(),
  };
}

// ---- compromise 英文实体识别 ----

/**
 * 使用 compromise 从标题中提取英文实体
 * 比正则更智能，能识别公司、产品、人名、地点
 */
export function extractEnglishEntities(titles: string[]): {
  organizations: [string, number][];
  people: [string, number][];
  places: [string, number][];
  nouns: [string, number][];
} {
  const orgCounts: Record<string, number> = {};
  const peopleCounts: Record<string, number> = {};
  const placeCounts: Record<string, number> = {};
  const nounCounts: Record<string, number> = {};

  // 已知公司/产品映射（compromise 可能识别不到的）
  const knownOrgs = new Set([
    "openai",
    "anthropic",
    "google",
    "deepseek",
    "meta",
    "microsoft",
    "apple",
    "xai",
    "minimax",
    "cursor",
    "codex",
    "copilot",
  ]);

  // 已知产品名（不应归为人名）
  const knownProducts = new Set([
    "claude",
    "gpt",
    "gemini",
    "gemma",
    "kimi",
    "qwen",
    "grok",
    "llama",
    "mistral",
    "sora",
    "opus",
    "sonnet",
    "mythos",
    "spud",
    "claude code",
    "claude opus",
    "claude mythos",
    "gemma 4",
  ]);

  for (const title of titles) {
    // 提取英文部分
    const enParts = title.match(/[A-Z][a-zA-Z0-9.+\-\s]{2,}/g) || [];

    for (const part of enParts) {
      const doc = compromise(part);

      // 组织/公司
      const orgs = doc.organizations().out("array") as string[];
      for (const o of orgs) {
        const key = o.toLowerCase().trim();
        if (key.length >= 2) {
          orgCounts[key] = (orgCounts[key] || 0) + 1;
        }
      }

      // 人名（过滤已知产品名）
      const people = doc.people().out("array") as string[];
      for (const p of people) {
        const key = p.trim().toLowerCase();
        if (key.length >= 2 && !knownProducts.has(key)) {
          peopleCounts[p.trim()] = (peopleCounts[p.trim()] || 0) + 1;
        }
      }

      // 地点
      const places = doc.places().out("array") as string[];
      for (const p of places) {
        const key = p.trim();
        if (key.length >= 2) {
          placeCounts[key] = (placeCounts[key] || 0) + 1;
        }
      }

      // 名词（作为补充实体）
      const nouns = doc.nouns().out("array") as string[];
      for (const n of nouns) {
        const key = n.toLowerCase().trim();
        if (key.length >= 2 && !knownOrgs.has(key)) {
          nounCounts[key] = (nounCounts[key] || 0) + 1;
        }
      }
    }
  }

  const sortAndSlice = (
    counts: Record<string, number>,
    topN = 10,
  ): [string, number][] =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

  return {
    organizations: sortAndSlice(orgCounts),
    people: sortAndSlice(peopleCounts),
    places: sortAndSlice(placeCounts),
    nouns: sortAndSlice(nounCounts),
  };
}
