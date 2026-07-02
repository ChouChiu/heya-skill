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
    "",
    "写作时把标题当成压缩新闻戏剧：实体名 + 突发动作 + 行业后果 + 情绪标点。",
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
    "",
    "词汇只做调味，不替代事实。素材偏中性时，优先加强节奏和结构，再提高情绪强度。",
  ].join("\n");
}

export function renderStructureFormulas(analysis: StyleAnalysis): string {
  const categories = Object.entries(analysis.structure.categories)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, summary]) => `- ${name}: ${summary.pct}%`);

  return [
    "## 标题公式",
    "",
    "优先使用以下公式：",
    "",
    "1. `{实体/公司} + 突然/重磅/炸裂 + {动作}，{对手/行业} + {反应/后果}！`",
    "2. `{事件A}；{事件B}；{事件C} | AI日报MMDD`",
    "3. `{数字/首次/万亿} + {事实突破}，{旧格局} 要被改写？`",
    "4. `{人物/公司} 硬刚 {对手}，{结果} 太离谱了！`",
    "5. `{产品/模型} 发布后，{行业/用户/资本市场} 全变了`",
    "",
    "样本结构占比：",
    ...categories,
    "",
    `常见开头钩子：${joinWords(analysis.structure.openingHooks)}`,
    `常见结尾钩子：${joinWords(analysis.structure.endingHooks)}`,
    `常见分隔符：${joinWords(analysis.punctuation.separatorUsage)}`,
  ].join("\n");
}

export function renderWritingRules(): string {
  return [
    "## 写作规则",
    "",
    "1. 默认写中文，除非用户明确要求其他语言。",
    "2. 优先输出一个长标题；用户要多个时，再给 3-5 个强度不同的版本。",
    "3. 标题必须保留用户给出的事实，不编造新公司、新数据、新结论。",
    "4. 先放最强冲突或最大结果，再用逗号、分号、竖线串联第二第三事件。",
    "5. 情绪词服务于事实：可以更戏剧化，但不能把不确定信息写成确定事实。",
    "6. 如果输入是日报、周报、合集，保留 `| AI日报MMDD` 或同类收束标签。",
    "7. 如果输入偏产品发布，突出“发布/上线/开源/升级 + 行业反应”。",
    "8. 如果输入偏争议事件，突出“谁对谁 + 冲突动作 + 代价/后果”。",
    "9. 避免短平标题；少用泛泛的“来了”“看看”，多用具体实体、数字和后果。",
  ].join("\n");
}

function joinWords(words: [string, number][]): string {
  return words.length > 0 ? words.map(([w]) => w).join("、") : "暂无";
}
