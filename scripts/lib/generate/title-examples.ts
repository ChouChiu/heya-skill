import type { AnalysisData } from "../types.ts";

/** 生成「真实标题示例」段落 */
export function genTitleExamples(data: AnalysisData): string {
  const structure = data.patterns.structure;
  const lines: string[] = [];
  lines.push("### 真实标题示例（直接学习）");
  lines.push("");

  // 情感式
  const qinggan = structure["情感式"];
  if (qinggan && qinggan.examples.length > 0) {
    lines.push(`**情感式（最常用，${qinggan.pctDisplay}）**：`);
    lines.push("```");
    for (const t of qinggan.examples.slice(0, 5)) lines.push(t);
    lines.push("```");
    lines.push("");
  }

  // 悬念式
  const xuannian = structure["悬念式"];
  if (xuannian && xuannian.examples.length > 0) {
    lines.push(`**悬念式（${xuannian.pctDisplay}）**：`);
    lines.push("```");
    for (const t of xuannian.examples.slice(0, 3)) lines.push(t);
    lines.push("```");
    lines.push("");
  }

  // 日报式
  const withDaily = (structure["其他"]?.examples || [])
    .filter((t: string) => /AI日报/.test(t))
    .slice(0, 3);
  if (withDaily.length > 0) {
    lines.push(`**日报式（${data.aiDaily.pct}%）**：`);
    lines.push("```");
    for (const t of withDaily) lines.push(t);
    lines.push("```");
    lines.push("");
  }

  // 对比式
  const duibi = structure["对比式"];
  if (duibi && duibi.examples.length > 0) {
    lines.push(`**对比式（${duibi.pctDisplay}）**：`);
    lines.push("```");
    for (const t of duibi.examples) lines.push(t);
    lines.push("```");
    lines.push("");
  }

  // 其他
  const qita = structure["其他"];
  if (qita && qita.examples.length > 0) {
    lines.push(`**其他（${qita.pctDisplay}）**：`);
    lines.push("```");
    for (const t of qita.examples.slice(0, 3)) lines.push(t);
    lines.push("```");
    lines.push("");
  }

  // 多标签交叉风格示例（新增）
  if (data.structure && data.structure.formulaTemplates.length > 0) {
    lines.push("**高频公式模板示例**：");
    lines.push("```");
    for (const { pattern, count } of data.structure.formulaTemplates.slice(
      0,
      3,
    )) {
      lines.push(`${pattern} （${count}次）`);
    }
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}
