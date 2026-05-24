import type { AnalysisResults } from "../types.ts";

/** 生成 Markdown 分析报告 */
export function generateReport(r: AnalysisResults, topN: number): string {
  const { total, lengthStats, numberStats, categories, punctStats } = r;
  const topWords = r.topWords.slice(0, topN);

  const lines: string[] = [];
  lines.push("# 黑鸦视频标题风格分析报告\n");
  lines.push(`共分析 **${total}** 个视频标题\n`);

  // 长度分布
  lines.push("## 1. 标题长度分布\n");
  lines.push("| 指标 | 字符数 |");
  lines.push("|------|--------|");
  lines.push(`| 平均 | ${lengthStats.avg} |`);
  lines.push(`| 最短 | ${lengthStats.min} |`);
  lines.push(`| 最长 | ${lengthStats.max} |`);
  lines.push(`| 中位数 | ${lengthStats.median} |`);
  lines.push("");

  for (const [range, count] of Object.entries(lengthStats.distribution)) {
    const pct = ((count / total) * 100).toFixed(1);
    lines.push(`- ${range}: ${count} (${pct}%)`);
  }
  lines.push("");

  // 数字使用
  lines.push("## 2. 数字使用\n");
  lines.push(`- 含数字的标题: ${numberStats.withNumberPct}%`);
  if (numberStats.commonNumbers.length > 0) {
    lines.push("\n常见数字:");
    for (const [num, count] of numberStats.commonNumbers) {
      lines.push(`  - ${num}: 出现 ${count} 次`);
    }
  }
  lines.push("");

  // 高频词汇
  lines.push(`## 3. 高频词汇 (Top ${topN})\n`);
  lines.push("| 排名 | 词汇 | 出现次数 |");
  lines.push("|------|------|----------|");
  for (let i = 0; i < topWords.length; i++) {
    const [word, count] = topWords[i];
    lines.push(`| ${i + 1} | ${word} | ${count} |`);
  }
  lines.push("");

  // 标题公式分类
  lines.push("## 4. 标题公式分类\n");
  lines.push("| 类型 | 数量 | 占比 | 示例 |");
  lines.push("|------|------|------|------|");
  for (const cat of [
    "悬念式",
    "数字列表式",
    "对比式",
    "情感式",
    "故事式",
    "教程式",
    "其他",
  ]) {
    const items = categories[cat] || [];
    const pct = ((items.length / total) * 100).toFixed(1);
    const example = items[0]
      ? items[0].length > 40
        ? `${items[0].slice(0, 40)}...`
        : items[0]
      : "-";
    lines.push(`| ${cat} | ${items.length} | ${pct}% | ${example} |`);
  }
  lines.push("");

  // 标点与格式
  lines.push("## 5. 标点与格式特征\n");
  lines.push(
    `- 问号结尾: ${punctStats.endsQuestion} (${((punctStats.endsQuestion / total) * 100).toFixed(1)}%)`,
  );
  lines.push(
    `- 感叹号结尾: ${punctStats.endsExclamation} (${((punctStats.endsExclamation / total) * 100).toFixed(1)}%)`,
  );
  lines.push(
    `- 省略号结尾: ${punctStats.endsEllipsis} (${((punctStats.endsEllipsis / total) * 100).toFixed(1)}%)`,
  );
  lines.push(
    `- 含书名号/引号: ${punctStats.hasAngleBracket} (${((punctStats.hasAngleBracket / total) * 100).toFixed(1)}%)`,
  );
  lines.push("");

  // 洞察
  lines.push("## 6. 关键洞察\n");

  if (parseFloat(numberStats.withNumberPct) > 50) {
    lines.push("- **数字驱动**: 超过50%的标题使用数字，数字是核心吸引力元素");
  }

  const dominantCat = Object.entries(categories)
    .filter(([cat]) => cat !== "其他")
    .sort((a, b) => b[1].length - a[1].length)[0];

  if (dominantCat) {
    lines.push(
      `- **主导公式**: 「${dominantCat[0]}」是使用最多的标题类型 (${dominantCat[1].length}/${total})`,
    );
  }

  if (parseFloat(lengthStats.avg) < 25) {
    lines.push("- **简洁风格**: 平均标题长度不到25字，倾向短标题");
  } else {
    lines.push("- **详细风格**: 平均标题超过25字，倾向描述性标题");
  }

  return lines.join("\n");
}
