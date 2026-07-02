import type { StyleAnalysis } from "../style-analysis/types.ts";

export function renderCoreFeatures(analysis: StyleAnalysis): string {
  const topCategory = Object.entries(analysis.structure.categories)
    .filter(([name]) => name !== "其他")
    .sort((a, b) => b[1].count - a[1].count)[0];

  return [
    "## 核心特征",
    "",
    `- 标题长度：平均 ${analysis.length.avg} 字，P75 ${analysis.length.p75} 字，P90 ${analysis.length.p90} 字；${analysis.length.over40Pct}% 超过 40 字。`,
    `- 信息密度：平均 ${analysis.structure.avgClauses} 个分句，平均 ${analysis.punctuation.averageSeparatorCount} 个分隔符。`,
    `- 情绪强度：平均情绪分 ${analysis.emotion.avgScore}；${analysis.punctuation.exclamationEndPct}% 以感叹号收尾，${analysis.rhetoric.questionPct}% 使用疑问钩子。`,
    `- 事实钩子：${analysis.numbers.withNumberPct}% 带数字，${analysis.rhetoric.namedEntityPct}% 带品牌、产品或人物名。`,
    `- 叙事倾向：冲突/对比 ${analysis.rhetoric.contrastPct}%，合集/日报 ${analysis.rhetoric.roundupPct}%。`,
    topCategory
      ? `- 主导结构：「${topCategory[0]}」占 ${topCategory[1].pct}%，常与情绪词、数字、实体名组合。`
      : "- 主导结构：多结构混合，优先保留长标题和多事件合并。",
  ].join("\n");
}

export function renderTitleExamples(analysis: StyleAnalysis): string {
  return [
    "## 真实标题示例",
    "",
    ...analysis.examples.slice(0, 12).map((video) => `- ${video.title}`),
  ].join("\n");
}

export function renderVocabLibrary(analysis: StyleAnalysis): string {
  return [
    "## 词汇库",
    "",
    `- 情绪词：${joinWords(analysis.keywords.emotion)}`,
    `- 主题词：${joinWords(analysis.keywords.topics)}`,
    `- 高频词：${joinWords(analysis.keywords.highFrequency.slice(0, 20))}`,
    `- 英文实体：${joinWords(analysis.entities.english)}`,
    `- 品牌/产品：${joinWords(analysis.entities.brandsAndProducts)}`,
    `- 人物名：${joinWords(analysis.entities.people)}`,
    `- 二元短语：${joinWords(analysis.keywords.bigrams.slice(0, 15))}`,
    `- 三元短语：${joinWords(analysis.keywords.trigrams.slice(0, 15))}`,
  ].join("\n");
}

export function renderStructureFormulas(analysis: StyleAnalysis): string {
  const categories = Object.entries(analysis.structure.categories)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, summary]) => `- ${name}: ${summary.pct}%`);

  return [
    "样本结构占比：",
    ...categories,
    "",
    `常见开头钩子：${joinWords(analysis.structure.openingHooks)}`,
    `常见结尾钩子：${joinWords(analysis.structure.endingHooks)}`,
    `常见分隔符：${joinWords(analysis.punctuation.separatorUsage)}`,
  ].join("\n");
}

function joinWords(words: [string, number][]): string {
  return words.length > 0 ? words.map(([w]) => w).join("\u3001") : "暂无";
}
