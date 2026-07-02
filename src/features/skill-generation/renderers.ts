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
    "写作时把标题当成荒诞新闻戏剧：情绪钩子 → 实体人格化 → 荒诞身体反应（瘫坐/癫痫/冷汗） → 核弹级后果 → 集体命运（死刑/斩杀线） → 日报收束。核心配方：地震/核弹 + 瘫坐/椅子爆炸 + 炼化/夺舍 + 集体死刑/斩杀线。",
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
    "## 黑鸦专属意象（AI 分析未覆盖，人工标注补充）",
    "",
    "- 荒诞身体：瘫坐、椅子爆炸、眩晕、癫痫、冷汗直流、头皮发麻、后背发凉、棺材板、全员颤抖、吓晕",
    "- 仙侠/网文：炼化、夺舍、祭出、龙王归来、诸神之战、命运大转折、接管世界、踢出群聊、生死簿、开错生死簿",
    "- 战争/灾难：硝烟弥漫、雪崩、海啸、血洗、血流成河、全线突围、天崩地裂、核冬天、大屠杀",
    "- 集体命运：集体判处死刑、斩杀线来了、移交军事法庭、被踢出群聊、人类灭亡倒计时",
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
    "6. `{情绪钩子}！{人物/CEO} 瘫坐在{核弹/椅子上}，仿佛看到了{椅子爆炸/毁灭}！{后续事件}！| AI日报MMDD`",
    "7. `{公司/模型} + {仙侠动词：炼化/夺舍/祭出/龙王归来} + {对手/行业}，{人群} + {集体命运：已被判处死刑/斩杀线来了/被踢出群聊}！`",
    "8. `{极端气象/灾难}！{行业} + {末日状态}：{事件A}；{事件B}；{事件C}，{讽刺收尾}！| AI日报MMDD`",
    "",
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
