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

  // 结构分析（新增）
  if (data.structure) {
    const { avgClauses, exclamationDensity, formulaTemplates } = data.structure;
    lines.push(`7. **多分句结构**：平均 ${avgClauses} 个分句，信息密度极高`);
    lines.push(`8. **感叹号密度**：平均每标题 ${exclamationDensity} 个感叹号`);
    if (formulaTemplates.length > 0) {
      lines.push(
        `9. **最常用公式**：\`${formulaTemplates[0].pattern}\`（${formulaTemplates[0].count}次）`,
      );
    }
  }

  // 多标签分类（新增）
  if (data.multiCategory) {
    const sorted = Object.entries(data.multiCategory)
      .filter(([cat]) => cat !== "其他")
      .sort((a, b) => b[1].totalCount - a[1].totalCount);
    if (sorted.length > 0) {
      const [topCat, topInfo] = sorted[0];
      lines.push(
        `10. **交叉风格**：「${topCat}」含交叉匹配 ${topInfo.totalCount} 次（${topInfo.pctDisplay}），标题常兼具多种风格`,
      );
    }
  }

  lines.push("");

  return lines.join("\n");
}
