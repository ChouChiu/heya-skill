import type { AnalysisData } from "../types.ts";

/** 生成「风格洞察」段落 — 基于 TF-IDF、时间趋势、共现分析 */
export function genStyleInsights(data: AnalysisData): string {
  const lines: string[] = [];
  lines.push("### 风格洞察（基于数据分析）");
  lines.push("");

  // TF-IDF 风格特征词
  if (data.tfidf && data.tfidf.topWords.length > 0) {
    lines.push("**最具风格辨识度的词（TF-IDF）**：");
    lines.push("（这些词最能代表黑鸦的独特风格，生成标题时优先使用）");
    lines.push("");
    lines.push(
      data.tfidf.topWords
        .slice(0, 10)
        .map((w) => `\`${w.word}\``)
        .join("、"),
    );
    lines.push("");
  }

  // 情绪词-主题词搭配
  if (data.coOccurrences && data.coOccurrences.length > 0) {
    lines.push("**情绪词常用搭配**：");
    lines.push("");
    for (const c of data.coOccurrences.slice(0, 6)) {
      lines.push(`- **${c.emotion}** 常搭配：${c.topics}`);
    }
    lines.push("");
  }

  // 时间趋势
  if (data.temporal && data.temporal.length >= 2) {
    const first = data.temporal[0];
    const last = data.temporal[data.temporal.length - 1];

    lines.push("**风格演变趋势**：");
    lines.push("");

    if (last.avgLength > first.avgLength * 1.1) {
      lines.push(
        `- 标题变长：从 ${first.period} 的 ${first.avgLength} 字 → ${last.period} 的 ${last.avgLength} 字`,
      );
    }
    if (last.emotionIntensity > first.emotionIntensity * 1.2) {
      lines.push(
        `- 情绪升级：强度从 ${first.emotionIntensity} → ${last.emotionIntensity}`,
      );
    }

    lines.push(`- 最新高频情绪词：${last.topEmotion}`);
    lines.push("");
  }

  // 公式模板（从语料自动提取）
  if (data.extractedTemplates && data.extractedTemplates.length > 0) {
    lines.push("**语料中高频公式模板**：");
    lines.push("");
    for (const t of data.extractedTemplates.slice(0, 5)) {
      const tmpl =
        t.template.length > 50 ? `${t.template.slice(0, 50)}...` : t.template;
      lines.push(`- \`${tmpl}\`（${t.count}次）`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
