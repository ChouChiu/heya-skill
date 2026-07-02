/**
 * @module
 *
 * Renders a {@link StyleAnalysis} object into a Markdown report.
 *
 * Output is written to `02-style-analysis.md` — kept alongside YAML for
 * human review without re‑running the pipeline.
 */
import type { StyleAnalysis } from "./types.ts";

/**
 * @param analysis - Style analysis result.
 * @returns Markdown report string.
 */
export function renderAnalysisReport(analysis: StyleAnalysis): string {
  const topCategory = Object.entries(analysis.structure.categories)
    .filter(([name]) => name !== "其他")
    .sort((a, b) => b[1].count - a[1].count)[0];

  return [
    "# 黑鸦标题风格分析",
    "",
    `- 创作者：${analysis.meta.creator}`,
    `- UID：${analysis.meta.uid}`,
    `- 样本数：${analysis.meta.totalVideos}`,
    `- 分析日期：${analysis.meta.analysisDate}`,
    `- 数据来源：${analysis.meta.source}`,
    "",
    "## 核心统计",
    "",
    `- 平均标题长度：${analysis.length.avg} 字`,
    `- P75 / P90：${analysis.length.p75} / ${analysis.length.p90} 字`,
    `- 40 字以上占比：${analysis.length.over40Pct}%`,
    `- 句末感叹号占比：${analysis.punctuation.exclamationEndPct}%`,
    `- 平均分隔符数量：${analysis.punctuation.averageSeparatorCount}`,
    `- 平均情绪强度：${analysis.emotion.avgScore}`,
    `- 含数字标题占比：${analysis.numbers.withNumberPct}%`,
    `- 命名实体标题占比：${analysis.rhetoric.namedEntityPct}%`,
    topCategory
      ? `- 最高频结构：${topCategory[0]}（${topCategory[1].pct}%）`
      : "",
    "",
    "## 结构分布",
    "",
    ...Object.entries(analysis.structure.categories)
      .sort((a, b) => b[1].count - a[1].count)
      .map(
        ([name, summary]) => `- ${name}：${summary.count} 条，${summary.pct}%`,
      ),
    "",
    "## 分句与标点",
    "",
    ...Object.entries(analysis.structure.clauseDistribution).map(
      ([name, count]) => `- ${name}：${count}`,
    ),
    "",
    "## 高频分隔符",
    "",
    formatKeywords(analysis.punctuation.separatorUsage),
    "",
    "## 高频情绪词",
    "",
    formatKeywords(analysis.keywords.emotion),
    "",
    "## 情绪强度标题",
    "",
    ...analysis.emotion.topTitles
      .slice(0, 8)
      .map(
        (item) =>
          `- [${item.level} ${item.score}] ${item.title}（${item.matchedWords.join("、") || "标点/疑问驱动"}）`,
      ),
    "",
    "## 高频主题词",
    "",
    formatKeywords(analysis.keywords.topics),
    "",
    "## TF-IDF 关键词",
    "",
    ...analysis.keywords.tfidf
      .slice(0, 20)
      .map(([word, score]) => `- ${word}：${score}`),
    "",
    "## 高频短语",
    "",
    `- 二元短语：${analysis.keywords.bigrams.map(([w]) => w).join("、") || "暂无"}`,
    `- 三元短语：${analysis.keywords.trigrams.map(([w]) => w).join("、") || "暂无"}`,
    "",
    "## 实体倾向",
    "",
    `- 英文实体：${analysis.entities.english.map(([w]) => w).join("、") || "暂无"}`,
    `- 品牌/产品：${analysis.entities.brandsAndProducts.map(([w]) => w).join("、") || "暂无"}`,
    `- 人名：${analysis.entities.people.map(([w]) => w).join("、") || "暂无"}`,
    "",
    "## 开头与结尾钩子",
    "",
    `- 常见开头：${analysis.structure.openingHooks.map(([w]) => w).join("、") || "暂无"}`,
    `- 常见结尾：${analysis.structure.endingHooks.map(([w]) => w).join("、") || "暂无"}`,
    "",
    "## 最近月份趋势",
    "",
    ...analysis.temporal.map(
      (item) =>
        `- ${item.period}：${item.titleCount} 条，均长 ${item.avgLength}，情绪 ${item.avgEmotionScore}，主结构 ${item.dominantCategory}`,
    ),
    "",
    "## 代表标题",
    "",
    ...analysis.examples.map((video) => `- ${video.title}`),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Format keyword count tuples as a Markdown list.
 *
 * @param keywords - `[word, count]` pairs.
 * @returns Markdown list lines, or `"- 暂无"` for empty.
 */
function formatKeywords(keywords: [string, number][]): string {
  if (keywords.length === 0) return "- 暂无";
  return keywords.map(([word, count]) => `- ${word}：${count}`).join("\n");
}
