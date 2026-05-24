import type { AnalysisData } from "../types.ts";

/** 生成「高频词汇库」段落 */
export function genVocabLibrary(data: AnalysisData): string {
  const { emotion, aiTerms, highFrequency } = data.keywords;
  const lines: string[] = [];
  lines.push("### 高频词汇库");
  lines.push("");

  lines.push("**情绪词（必用）**：");
  lines.push(
    emotion
      .slice(0, 15)
      .map((e) => e.word)
      .join("、"),
  );
  lines.push("");

  lines.push("**AI 领域词**：");
  lines.push(
    aiTerms
      .slice(0, 15)
      .map((e) => e.word)
      .join("、"),
  );
  lines.push("");

  lines.push("**高频词 Top 20**：");
  lines.push(
    highFrequency
      .slice(0, 20)
      .map((e) => `${e.word}(${e.count})`)
      .join("、"),
  );
  lines.push("");

  // 按词性分类的词汇（新增）
  if (data.wordsByPOS) {
    const { adjectives, verbs, nouns, english } = data.wordsByPOS;

    if (adjectives.length > 0) {
      lines.push("**描述词/形容词（情绪渲染）**：");
      lines.push(
        adjectives
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }

    if (verbs.length > 0) {
      lines.push("**动作词/动词（事件描述）**：");
      lines.push(
        verbs
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }

    if (nouns.length > 0) {
      lines.push("**名词/实体词（主题概念）**：");
      lines.push(
        nouns
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }

    if (english.length > 0) {
      lines.push("**英文词（品牌/产品名）**：");
      lines.push(
        english
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }
  }

  // 命名实体（新增）
  if (data.entities) {
    const { companies, products } = data.entities;

    if (companies.length > 0) {
      lines.push("**公司/机构**：");
      lines.push(
        companies
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }

    if (products.length > 0) {
      lines.push("**产品/模型**：");
      lines.push(
        products
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }
  }

  // 高频短语（新增）
  if (data.ngrams) {
    const { bigrams, trigrams } = data.ngrams;

    if (bigrams.length > 0) {
      lines.push("**高频二元短语**：");
      lines.push(
        bigrams
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }

    if (trigrams.length > 0) {
      lines.push("**高频三元短语**：");
      lines.push(
        trigrams
          .slice(0, 10)
          .map((e) => `${e.word}(${e.count})`)
          .join("、"),
      );
      lines.push("");
    }
  }

  return lines.join("\n");
}
