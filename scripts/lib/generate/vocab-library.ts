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

  return lines.join("\n");
}
