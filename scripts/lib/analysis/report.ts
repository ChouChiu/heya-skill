import type { AnalysisResults } from "../types.ts";

/** 生成对齐风格的 Markdown 表格行 */
function alignedTableRow(cells: string[], widths: number[]): string {
  return `| ${cells.map((c, i) => c.padEnd(widths[i])).join(" | ")} |`;
}

/** 生成对齐风格的 Markdown 表格分隔行 */
function alignedTableSep(widths: number[]): string {
  return `|${widths.map((w) => "-".repeat(w + 2)).join("|")}|`;
}

/** 生成 Markdown 分析报告 */
export function generateReport(r: AnalysisResults, topN: number): string {
  const { total, lengthStats, numberStats, categories, punctStats } = r;
  const topWords = r.topWords.slice(0, topN);

  const lines: string[] = [];
  lines.push("# 黑鸦视频标题风格分析报告\n");
  lines.push(`共分析 **${total}** 个视频标题\n`);

  // 1. 长度分布
  lines.push("## 1. 标题长度分布\n");
  const lenWidths = [6, 8];
  lines.push(alignedTableRow(["指标", "字符数"], lenWidths));
  lines.push(alignedTableSep(lenWidths));
  lines.push(alignedTableRow(["平均", `${lengthStats.avg}`], lenWidths));
  lines.push(alignedTableRow(["最短", `${lengthStats.min}`], lenWidths));
  lines.push(alignedTableRow(["最长", `${lengthStats.max}`], lenWidths));
  lines.push(alignedTableRow(["中位数", `${lengthStats.median}`], lenWidths));
  lines.push("");
  for (const [range, count] of Object.entries(lengthStats.distribution)) {
    const pct = ((count / total) * 100).toFixed(1);
    lines.push(`- ${range}: ${count} (${pct}%)`);
  }
  lines.push("");

  // 2. 数字使用
  lines.push("## 2. 数字使用\n");
  lines.push(`- 含数字的标题: ${numberStats.withNumberPct}%`);
  if (numberStats.commonNumbers.length > 0) {
    lines.push("\n常见数字:");
    for (const [num, count] of numberStats.commonNumbers) {
      lines.push(`  - ${num}: 出现 ${count} 次`);
    }
  }
  lines.push("");

  // 3. 高频词汇
  lines.push(`## 3. 高频词汇 (Top ${topN})\n`);
  const wordWidths = [4, 12, 8];
  lines.push(alignedTableRow(["排名", "词汇", "出现次数"], wordWidths));
  lines.push(alignedTableSep(wordWidths));
  for (let i = 0; i < topWords.length; i++) {
    const [word, count] = topWords[i];
    lines.push(alignedTableRow([`${i + 1}`, word, `${count}`], wordWidths));
  }
  lines.push("");

  // 4. TF-IDF 风格特征词
  if (r.tfidfTopWords && r.tfidfTopWords.length > 0) {
    lines.push("## 4. TF-IDF 风格特征词\n");
    lines.push(
      "（TF-IDF 越高，说明该词越能代表此创作者的独特风格，而非通用高频词）\n",
    );
    const tfidfWidths = [4, 12, 8, 6];
    lines.push(
      alignedTableRow(["排名", "词汇", "TF-IDF", "词频"], tfidfWidths),
    );
    lines.push(alignedTableSep(tfidfWidths));
    for (let i = 0; i < Math.min(r.tfidfTopWords.length, 20); i++) {
      const { word, tfidf, freq } = r.tfidfTopWords[i];
      lines.push(
        alignedTableRow([`${i + 1}`, word, `${tfidf}`, `${freq}`], tfidfWidths),
      );
    }
    lines.push("");
  }

  // 5. 按词性分类的高频词
  lines.push("## 5. 按词性分类的高频词\n");
  const { wordsByPOS } = r;

  lines.push("**形容词/描述词（情绪色彩）**：");
  lines.push(
    wordsByPOS.adjectives
      .slice(0, 10)
      .map(([w, c]) => `${w}(${c})`)
      .join("、"),
  );
  lines.push("");

  lines.push("**动词（动作/事件）**：");
  lines.push(
    wordsByPOS.verbs
      .slice(0, 10)
      .map(([w, c]) => `${w}(${c})`)
      .join("、"),
  );
  lines.push("");

  lines.push("**名词（实体/概念）**：");
  lines.push(
    wordsByPOS.nouns
      .slice(0, 10)
      .map(([w, c]) => `${w}(${c})`)
      .join("、"),
  );
  lines.push("");

  lines.push("**英文词（品牌/产品）**：");
  lines.push(
    wordsByPOS.english
      .slice(0, 10)
      .map(([w, c]) => `${w}(${c})`)
      .join("、"),
  );
  lines.push("");

  // 6. N-gram 短语
  lines.push("## 6. 高频短语（N-gram）\n");
  if (r.ngrams.bigrams.length > 0) {
    lines.push("**二元短语**：");
    lines.push(
      r.ngrams.bigrams
        .slice(0, 10)
        .map((n) => `${n.phrase}(${n.count})`)
        .join("、"),
    );
    lines.push("");
  }
  if (r.ngrams.trigrams.length > 0) {
    lines.push("**三元短语**：");
    lines.push(
      r.ngrams.trigrams
        .slice(0, 10)
        .map((n) => `${n.phrase}(${n.count})`)
        .join("、"),
    );
    lines.push("");
  }

  // 7. 命名实体
  lines.push("## 7. 命名实体\n");
  if (r.entities.companies.length > 0) {
    lines.push("**公司/机构**：");
    lines.push(
      r.entities.companies
        .slice(0, 10)
        .map(([w, c]) => `${w}(${c})`)
        .join("、"),
    );
    lines.push("");
  }
  if (r.entities.products.length > 0) {
    lines.push("**产品/模型**：");
    lines.push(
      r.entities.products
        .slice(0, 10)
        .map(([w, c]) => `${w}(${c})`)
        .join("、"),
    );
    lines.push("");
  }
  if (r.entities.people.length > 0) {
    lines.push("**人物**：");
    lines.push(
      r.entities.people
        .slice(0, 10)
        .map(([w, c]) => `${w}(${c})`)
        .join("、"),
    );
    lines.push("");
  }

  // 8. 标题公式分类
  lines.push("## 8. 标题公式分类\n");
  const catRows: string[][] = [];
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
      ? items[0].length > 35
        ? `${items[0].slice(0, 35)}...`
        : items[0]
      : "-";
    const safeExample = example.replace(/\|/g, "\\|");
    catRows.push([cat, `${items.length}`, `${pct}%`, safeExample]);
  }
  const catWidths = [6, 4, 6, 38];
  lines.push(alignedTableRow(["类型", "数量", "占比", "示例"], catWidths));
  lines.push(alignedTableSep(catWidths));
  for (const row of catRows) lines.push(alignedTableRow(row, catWidths));
  lines.push("");

  // 9. 多标签分类统计
  if (r.multiCategory) {
    lines.push("## 9. 多标签分类统计\n");
    lines.push("（一个标题可同时属于多个分类）\n");
    const mcWidths = [6, 11, 11, 6];
    lines.push(
      alignedTableRow(["类型", "高置信匹配", "含交叉匹配", "占比"], mcWidths),
    );
    lines.push(alignedTableSep(mcWidths));
    for (const cat of [
      "悬念式",
      "数字列表式",
      "对比式",
      "情感式",
      "故事式",
      "教程式",
    ]) {
      const matches = r.multiCategory[cat] || [];
      const totalCount = matches.length;
      const highConf = matches.filter((m) => m.score >= 0.5).length;
      const pct = ((totalCount / total) * 100).toFixed(1);
      lines.push(
        alignedTableRow(
          [cat, `${highConf}`, `${totalCount}`, `${pct}%`],
          mcWidths,
        ),
      );
    }
    lines.push("");
  }

  // 10. 结构分析
  lines.push("## 10. 标题结构分析\n");
  const { structure } = r;
  lines.push(`- 平均分句数: ${structure.avgClauses}`);
  lines.push(`- 感叹号密度: 平均每标题 ${structure.exclamationDensity} 个`);
  lines.push("");
  lines.push("**分句数分布**：");
  for (const [bucket, count] of Object.entries(structure.clauseDistribution)) {
    const pct = ((count / total) * 100).toFixed(1);
    lines.push(`- ${bucket}: ${count} (${pct}%)`);
  }
  lines.push("");
  if (structure.formulaTemplates.length > 0) {
    lines.push("**高频公式模板**：");
    for (const { pattern, count } of structure.formulaTemplates) {
      lines.push(`- \`${pattern}\`: ${count} 次`);
    }
    lines.push("");
  }

  // 11. 公式模板挖掘
  if (r.extractedTemplates && r.extractedTemplates.length > 0) {
    lines.push("## 11. 自动挖掘的公式模板\n");
    lines.push("（用占位符替换实体后，从语料中自动提取的高频结构）\n");
    lines.push("| 模板 | 次数 | 示例 |");
    lines.push("|------|------|------|");
    for (const t of r.extractedTemplates.slice(0, 8)) {
      const tmpl =
        t.template.length > 50 ? `${t.template.slice(0, 50)}...` : t.template;
      const ex = t.examples[0]
        ? t.examples[0].length > 40
          ? `${t.examples[0].slice(0, 40)}...`
          : t.examples[0]
        : "-";
      lines.push(`| \`${tmpl}\` | ${t.count} | ${ex} |`);
    }
    lines.push("");
  }

  // 12. 情绪强度评分
  if (r.emotionIntensity && r.emotionIntensity.length > 0) {
    lines.push("## 12. 情绪强度分析\n");

    const dist: Record<string, number> = {
      极强: 0,
      强烈: 0,
      中等: 0,
      轻微: 0,
      无: 0,
    };
    let totalScore = 0;
    for (const e of r.emotionIntensity) {
      dist[e.level]++;
      totalScore += e.score;
    }
    const avgScore = Math.round((totalScore / total) * 10) / 10;

    lines.push(`- 平均情绪强度: ${avgScore} 分`);
    lines.push("");
    lines.push("**强度分布**：");
    for (const [level, count] of Object.entries(dist)) {
      const pct = ((count / total) * 100).toFixed(1);
      lines.push(`- ${level}: ${count} (${pct}%)`);
    }
    lines.push("");

    lines.push("**情绪最强烈的标题 Top 5**：");
    const sorted = [...r.emotionIntensity].sort((a, b) => b.score - a.score);
    for (const e of sorted.slice(0, 5)) {
      const title =
        e.title.length > 60 ? `${e.title.slice(0, 60)}...` : e.title;
      lines.push(`- [${e.level} ${e.score}分] ${title}`);
    }
    lines.push("");
  }

  // 13. 时间维度演变
  if (r.temporal && r.temporal.length > 0) {
    lines.push("## 13. 时间维度演变趋势\n");
    const tempWidths = [8, 6, 8, 10, 8, 12];
    lines.push(
      alignedTableRow(
        [
          "月份",
          "标题数",
          "平均长度",
          "感叹号密度",
          "情绪强度",
          "最高频情绪词",
        ],
        tempWidths,
      ),
    );
    lines.push(alignedTableSep(tempWidths));
    for (const t of r.temporal) {
      lines.push(
        alignedTableRow(
          [
            t.period,
            `${t.titleCount}`,
            `${t.avgLength}`,
            `${t.exclamationDensity}`,
            `${t.emotionIntensity}`,
            t.topEmotion,
          ],
          tempWidths,
        ),
      );
    }
    lines.push("");
  }

  // 14. 共现分析
  if (r.coOccurrences && r.coOccurrences.length > 0) {
    lines.push("## 14. 情绪词-主题词搭配\n");
    lines.push("（情绪词常与哪些公司/产品/概念共同出现）\n");
    const coWidths = [8, 30, 8];
    lines.push(alignedTableRow(["情绪词", "搭配主题词", "共现次数"], coWidths));
    lines.push(alignedTableSep(coWidths));
    for (const c of r.coOccurrences.slice(0, 10)) {
      lines.push(
        alignedTableRow(
          [c.emotionWord, c.topicWords.join("、"), `${c.count}`],
          coWidths,
        ),
      );
    }
    lines.push("");
  }

  // 15. 标点与格式
  lines.push("## 15. 标点与格式特征\n");
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

  // 16. 动态发现的情绪词
  if (r.dynamicEmotion && r.dynamicEmotion.length > 0) {
    lines.push("## 16. 动态发现的情绪词\n");
    lines.push("（从语料中自动提取的高频形容词/动词，不在静态词表中）\n");
    lines.push(
      r.dynamicEmotion
        .slice(0, 15)
        .map(([w, c], i) => `${i + 1}. ${w}(${c})`)
        .join("\n"),
    );
    lines.push("");
  }

  // 17. sentiment 情绪分析（natural/sentiment）
  if (r.sentimentAnalysis) {
    lines.push("## 17. Sentiment 情绪分析\n");
    lines.push("（使用 AFINN 英文词典 + 自定义中文情绪词典）\n");
    lines.push(`- 平均情绪得分: ${r.sentimentAnalysis.avgScore}`);
    lines.push("");
    lines.push("**强度分布**：");
    for (const [level, count] of Object.entries(
      r.sentimentAnalysis.distribution,
    )) {
      const pct = ((count / total) * 100).toFixed(1);
      lines.push(`- ${level}: ${count} (${pct}%)`);
    }
    lines.push("");

    if (r.sentimentAnalysis.topPositive.length > 0) {
      lines.push("**最正面标题 Top 3**：");
      for (const p of r.sentimentAnalysis.topPositive.slice(0, 3)) {
        const t = p.title.length > 60 ? `${p.title.slice(0, 60)}...` : p.title;
        lines.push(`- [+${p.score}] ${t}`);
      }
      lines.push("");
    }

    if (r.sentimentAnalysis.topNegative.length > 0) {
      lines.push("**最负面标题 Top 3**：");
      for (const p of r.sentimentAnalysis.topNegative.slice(0, 3)) {
        const t = p.title.length > 60 ? `${p.title.slice(0, 60)}...` : p.title;
        lines.push(`- [${p.score}] ${t}`);
      }
      lines.push("");
    }
  }

  // 18. 英文实体（compromise）
  if (r.englishEntities) {
    lines.push("## 18. 英文实体识别（compromise NLP）\n");

    if (r.englishEntities.organizations.length > 0) {
      lines.push("**组织/公司**：");
      lines.push(
        r.englishEntities.organizations
          .slice(0, 10)
          .map(([w, c]) => `${w}(${c})`)
          .join("、"),
      );
      lines.push("");
    }

    if (r.englishEntities.places.length > 0) {
      lines.push("**地点**：");
      lines.push(
        r.englishEntities.places
          .slice(0, 10)
          .map(([w, c]) => `${w}(${c})`)
          .join("、"),
      );
      lines.push("");
    }

    if (r.englishEntities.people.length > 0) {
      lines.push("**人物**：");
      lines.push(
        r.englishEntities.people
          .slice(0, 10)
          .map(([w, c]) => `${w}(${c})`)
          .join("、"),
      );
      lines.push("");
    }

    if (r.englishEntities.nouns.length > 0) {
      lines.push("**英文名词**：");
      lines.push(
        r.englishEntities.nouns
          .slice(0, 10)
          .map(([w, c]) => `${w}(${c})`)
          .join("、"),
      );
      lines.push("");
    }
  }

  // 19. 关键洞察
  lines.push("## 19. 关键洞察\n");

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

  if (structure.avgClauses >= 3) {
    lines.push(
      `- **多分句风格**: 平均 ${structure.avgClauses} 个分句，标题信息密度高`,
    );
  }

  if (structure.exclamationDensity >= 2) {
    lines.push(
      `- **感叹号密集**: 平均每标题 ${structure.exclamationDensity} 个感叹号，情绪渲染强烈`,
    );
  }

  // TF-IDF 洞察
  if (r.tfidfTopWords && r.tfidfTopWords.length > 0) {
    const topTfidf = r.tfidfTopWords
      .slice(0, 5)
      .map((w) => w.word)
      .join("、");
    lines.push(`- **风格特征词**: ${topTfidf} 是最具风格辨识度的词汇`);
  }

  // 情绪强度洞察
  if (r.emotionIntensity && r.emotionIntensity.length > 0) {
    const strong = r.emotionIntensity.filter(
      (e) => e.level === "极强" || e.level === "强烈",
    ).length;
    const pct = ((strong / total) * 100).toFixed(1);
    if (strong > 0) {
      lines.push(
        `- **情绪炸弹**: ${pct}% 的标题达到「强烈」或「极强」情绪等级`,
      );
    }
  }

  // 时间趋势洞察
  if (r.temporal && r.temporal.length >= 2) {
    const first = r.temporal[0];
    const last = r.temporal[r.temporal.length - 1];
    if (last.avgLength > first.avgLength * 1.1) {
      lines.push(
        `- **标题变长趋势**: 从 ${first.period} 的 ${first.avgLength} 字增长到 ${last.period} 的 ${last.avgLength} 字`,
      );
    }
    if (last.emotionIntensity > first.emotionIntensity * 1.2) {
      lines.push(
        `- **情绪升级趋势**: 情绪强度从 ${first.emotionIntensity} 升至 ${last.emotionIntensity}`,
      );
    }
  }

  return lines.join("\n");
}
