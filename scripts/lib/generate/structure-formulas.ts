import type { AnalysisData } from "../types.ts";

/** 生成「结构公式」段落 */
export function genStructureFormulas(data: AnalysisData): string {
  const structure = data.patterns.structure;
  const lines: string[] = [];

  // 公式1: 情感式
  if (
    structure["情感式"]?.templates?.length &&
    structure["情感式"].templates.length > 0
  ) {
    lines.push(
      `**公式1：情绪词 + 主题 + 副标题（最常用，${structure["情感式"].pctDisplay}）**`,
    );
    lines.push("```");
    lines.push("{情绪词}！{主题}，{副标题}！");
    lines.push("```");
    lines.push("");
  }

  // 公式2: 多事件合并
  lines.push("**公式2：多事件合并**");
  lines.push("```");
  lines.push("{事件1}！{事件2}！{事件3}！| AI日报{MMDD}");
  lines.push("```");
  lines.push("");

  // 公式3: 悬念式
  if (
    structure["悬念式"]?.templates?.length &&
    structure["悬念式"].templates.length > 0
  ) {
    lines.push(`**公式3：悬念式（${structure["悬念式"].pctDisplay}）**`);
    lines.push("```");
    lines.push("{情绪词}！{主题}泄露/曝出/传出，{副标题}？");
    lines.push("```");
    lines.push("");
  }

  // 公式4: 日报式
  lines.push(`**公式4：日报式（${data.aiDaily.pct}%）**`);
  lines.push("```");
  lines.push("{主题} | AI日报{MMDD}");
  lines.push("```");
  lines.push("");

  // 从结构分析中提取的高频公式模板（新增）
  if (data.structure && data.structure.formulaTemplates.length > 0) {
    lines.push("**语料中高频公式模板**：\n");
    for (const { pattern, count } of data.structure.formulaTemplates) {
      lines.push(`- \`${pattern}\`: ${count} 次`);
    }
    lines.push("");
  }

  // 分类占比表
  lines.push("### 分类占比");
  lines.push("");
  lines.push("| 类型 | 数量 | 占比 |");
  lines.push("|------|------|------|");
  for (const [cat, info] of Object.entries(structure)) {
    lines.push(`| ${cat} | ${info.count} | ${info.pctDisplay} |`);
  }
  lines.push("");

  // 多标签分类占比（新增）
  if (data.multiCategory) {
    lines.push("### 多标签分类占比（含交叉匹配）");
    lines.push("");
    lines.push("| 类型 | 高置信匹配 | 含交叉匹配 | 占比 |");
    lines.push("|------|-----------|-----------|------|");
    for (const [cat, info] of Object.entries(data.multiCategory)) {
      lines.push(
        `| ${cat} | ${info.pureCount} | ${info.totalCount} | ${info.pctDisplay} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
