import type { AnalysisData } from "../types.ts";

/** 生成「核心特征」段落 */
export function genCoreFeatures(data: AnalysisData): string {
  const { length, punctuation, aiDaily, patterns, keywords } = data;
  const lines: string[] = [];
  lines.push("### 核心特征");
  lines.push("");
  lines.push(
    `1. **超长标题**：平均 ${length.avg} 字，${length.over40Pct}% 超过 40 字`,
  );
  lines.push(
    `2. **情绪炸弹**：大量使用感叹号（${Math.round(punctuation.exclamationEnd * 100)}%）和情绪词`,
  );
  lines.push("3. **多事件合并**：一个标题常包含 2-3 条新闻");

  const dominant = Object.entries(patterns.structure)
    .filter(([cat]) => cat !== "其他")
    .sort((a, b) => b[1].count - a[1].count)[0];
  if (dominant) {
    lines.push(
      `4. **AI 日报格式**：${aiDaily.pct}% 的标题带 "| AI日报MMDD" 后缀`,
    );
    lines.push(
      `5. **主导风格**：「${dominant[0]}」占比 ${dominant[1].pctDisplay}`,
    );
  }
  lines.push(
    `6. **独特词汇**：${keywords.uniqueExpressions.slice(0, 10).join("、")}`,
  );
  lines.push("");

  return lines.join("\n");
}
