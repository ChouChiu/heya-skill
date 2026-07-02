import { cut, tag } from "jieba-wasm";
import type { WordCount } from "./types.ts";

// ---- stop words ----

export const STOP_WORDS = new Set([
  "我",
  "你",
  "他",
  "她",
  "它",
  "们",
  "自己",
  "我们",
  "你们",
  "他们",
  "这",
  "那",
  "这个",
  "那个",
  "这些",
  "那些",
  "这里",
  "那里",
  "这边",
  "那边",
  "什么",
  "谁",
  "哪",
  "哪个",
  "哪里",
  "多少",
  "几",
  "怎样",
  "怎么样",
  "的",
  "了",
  "着",
  "过",
  "地",
  "得",
  "之",
  "所",
  "以",
  "在",
  "从",
  "把",
  "被",
  "让",
  "用",
  "对",
  "为",
  "给",
  "向",
  "往",
  "到",
  "按照",
  "根据",
  "通过",
  "经过",
  "关于",
  "对于",
  "至于",
  "和",
  "与",
  "或",
  "或者",
  "还是",
  "而且",
  "并且",
  "但是",
  "但",
  "然而",
  "不过",
  "虽然",
  "因为",
  "所以",
  "如果",
  "即使",
  "既然",
  "无论",
  "就",
  "也",
  "都",
  "很",
  "还",
  "又",
  "再",
  "才",
  "已",
  "已经",
  "正在",
  "将",
  "可能",
  "大概",
  "也许",
  "不",
  "没",
  "没有",
  "不是",
  "别",
  "非常",
  "十分",
  "特别",
  "更",
  "最",
  "太",
  "挺",
  "相当",
  "比较",
  "是",
  "有",
  "说",
  "要",
  "去",
  "会",
  "能",
  "可以",
  "应该",
  "必须",
  "看",
  "做",
  "来",
  "上",
  "下",
  "出",
  "入",
  "开",
  "关",
  "就是",
  "不是",
  "所有",
  "每个",
  "一些",
  "其他",
  "另外",
  "以及",
  "之后",
  "之前",
  "以后",
  "以前",
  "时候",
  "现在",
  "今天",
  "昨天",
  "明天",
  "今年",
  "去年",
  "年",
  "月",
  "日",
  "号",
  "点",
  "分",
  "秒",
  "个",
  "种",
  "些",
  "次",
  "啊",
  "呀",
  "吧",
  "呢",
  "吗",
  "哦",
  "嗯",
  "哈",
  "嘛",
  "啦",
  "噢",
  "一个",
  "一种",
  "这个",
  "那个",
  "怎么",
  "为什么",
]);

// ---- tokenization ----

export function segmentWords(text: string): string[] {
  const words = cut(text, true);
  return words.filter((w) => w.trim().length >= 2 && !STOP_WORDS.has(w));
}

export interface POSToken {
  word: string;
  tag: string;
}

export function segmentWithPOS(text: string): POSToken[] {
  const tokens = tag(text);
  return tokens.filter(
    (t) => t.word.trim().length >= 1 && !STOP_WORDS.has(t.word),
  );
}

// ---- ngram helpers ----

export function extractWordNgrams(
  titles: string[],
  size: 2 | 3,
  limit: number,
): { phrase: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const title of titles) {
    const words = segmentWords(title);
    for (let i = 0; i <= words.length - size; i++) {
      const phrase = words.slice(i, i + size).join("");
      if (phrase.length < size * 2) continue;
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

// ---- TF-IDF ----

export function computeTFIDF(titles: string[], limit: number): WordCount[] {
  const totalDocs = titles.length;
  const docFreq = new Map<string, number>();
  const allWords: string[][] = [];

  for (const title of titles) {
    const words = [...new Set(segmentWords(title))];
    allWords.push(words);
    for (const w of words) {
      docFreq.set(w, (docFreq.get(w) ?? 0) + 1);
    }
  }

  const tfidf = new Map<string, number>();
  for (const words of allWords) {
    for (const w of words) {
      const tf = 1;
      const idf = Math.log(totalDocs / ((docFreq.get(w) ?? 1) + 1)) + 1;
      tfidf.set(w, (tfidf.get(w) ?? 0) + tf * idf);
    }
  }

  return [...tfidf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, score]) => [word, Math.round(score * 100) / 100] as WordCount);
}
