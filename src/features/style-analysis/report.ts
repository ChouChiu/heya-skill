/**
 * @module
 *
 * Markdown report renderer for style analysis.
 */
import type { StyleAnalysis } from "./types.ts";

/** Tokens that are not real entities and should be filtered from display. */
const entityBlocklist = new Set(["|", "|AI日报", "| AI日报", "｜"]);

/** Brand/organization names that NER incorrectly classifies as PERSON. */
const nonPersonEntities = new Set([
	"openai",
	"阶跃",
	"星辰",
	"阿里",
	"openai危",
	"claude",
	"opus",
	"deepseek",
	"谷歌云",
	"kimi",
	"qwen",
	"gemini",
	"gpt",
]);

const signalIdToLabel: Record<string, string> = {
	emotion_burst: "情绪爆点",
	number_hook: "数字悬念",
	daily: "日报式",
	absurd_imagery: "荒诞意象",
	multi_event: "多事件合并",
	contrast: "对比冲突",
};

export function renderAnalysisReport(analysis: StyleAnalysis): string {
	return [
		"# 黑鸦标题风格分析",
		"",
		"## 元信息",
		`- 创作者：${analysis.corpus.creator}`,
		`- UID：${analysis.corpus.uid}`,
		`- 样本数：${analysis.corpus.totalTitles}`,
		`- 样本范围：${analysis.corpus.dateRange.oldest} 至 ${analysis.corpus.dateRange.newest}`,
		`- NLP：${analysis.nlp.backend} (${analysis.nlp.tasks.join(", ")})`,
		`- 生成时间：${analysis.nlp.generatedAt}`,
		"",
		"## 核心统计",
		`- 平均标题长度：${analysis.corpus.length.avg} 字`,
		`- P75 / P90：${analysis.corpus.length.p75} / ${analysis.corpus.length.p90} 字`,
		`- 40 字以上占比：${analysis.corpus.length.over40Pct}%`,
		`- 平均分句：${analysis.corpus.clauses.avg}`,
		`- 平均分隔符：${analysis.corpus.punctuation.averageSeparatorCount}`,
		`- 句末感叹号占比：${analysis.corpus.punctuation.exclamationEndPct}%`,
		`- 实体覆盖率：${analysis.entities.coveragePct}%`,
		"",
		"## 修辞信号",
		...Object.entries(analysis.rhetoric.signals)
			.sort((a, b) => b[1].count - a[1].count)
			.map(([id, summary]) => `- ${id}：${summary.count} 条，${summary.pct}%`),
		...(Object.keys(analysis.rhetoric.signals).length === 0 ? ["- 暂无"] : []),
		"",
		"## 实体倾向",
		`- 品牌/产品：${joinWords(analysis.entities.brandsAndProducts)}`,
		`- 人物：${joinWords(analysis.entities.people)}`,
		`- 组织：${joinWords(analysis.entities.organizations)}`,
		`- 模型版本：${joinWords(analysis.entities.modelVersions)}`,
		`- 英文实体：${joinWords(analysis.entities.english)}`,
		"",
		"## 词汇与短语",
		`- 高频 Token：${joinWords(analysis.lexicon.highFrequency.slice(0, 24))}`,
		`- 领域词：${joinWords(analysis.lexicon.domainTerms)}`,
		`- 情绪词：${joinWords(analysis.lexicon.emotionWords)}`,
		`- 二元短语：${joinWords(analysis.phrases.bigrams)}`,
		`- 三元短语：${joinWords(analysis.phrases.trigrams)}`,
		`- 跨 Token 搭配：${joinWords(analysis.phrases.crossToken)}`,
		`- 荒诞意象：${joinWords(analysis.phrases.imagery)}`,
		"",
		"## 开头与结尾钩子",
		`- 常见开头：${joinWords(analysis.phrases.openingHooks)}`,
		`- 常见结尾：${joinWords(analysis.phrases.endingHooks)}`,
		"",
		"## 生成公式",
		...analysis.generation.recommendedFormulas.map((formula) => `- ${formula}`),
		"",
		"## 写作约束",
		...analysis.generation.writingConstraints.map((rule) => `- ${rule}`),
		"",
		"## 代表标题",
		...analysis.generation.representativeTitles.map((title) => `- ${title}`),
		"",
		"## 近期标题样本",
		...analysis.corpus.examples.recent.map((video) => `- ${video.title}`),
	].join("\n");
}

export function renderLlmBrief(analysis: StyleAnalysis): string {
	const topSignals = Object.entries(analysis.rhetoric.signals).sort(
		(a, b) => b[1].count - a[1].count,
	);

	const signalDetail = topSignals.map(([id, summary]) => {
		const label = signalIdToLabel[id] ?? id;
		return `- ${label}：${summary.count}条(${summary.pct}%)`;
	});

	const topSeparators = analysis.corpus.punctuation.separatorUsage
		.slice(0, 5)
		.map(([sep, count]) => `${sep}(${count}次)`)
		.join("、");

	const topBigrams = analysis.phrases.bigrams
		.slice(0, 10)
		.map(([text, count]) => `${text}(${count})`)
		.join(" ");

	const topOpeningHooks = analysis.phrases.openingHooks
		.slice(0, 8)
		.map(([text, _count]) => text)
		.join("、");

	const topEndingHooks = analysis.phrases.endingHooks
		.slice(0, 10)
		.filter(([text]) => text.length >= 4 && text.length <= 7)
		.map(([text]) => text)
		.join("、");

	const clauseDist = analysis.corpus.clauses.distribution;

	const extremeSamples = analysis.corpus.examples.mostEmotional
		.slice(0, 5)
		.map((title) => `- ${title}`);

	const shortSamples = analysis.corpus.examples.recent
		.filter((v) => [...v.title].length <= 48)
		.slice(0, 4);
	const shortStr =
		shortSamples.length >= 2
			? shortSamples
					.map((v) => `- (${[...v.title].length}字) ${v.title}`)
					.join("\n")
			: "";

	return [
		"# 黑鸦标题风格 LLM Brief",
		"",
		`数据范围：${analysis.corpus.dateRange.oldest} → ${analysis.corpus.dateRange.newest}，共 ${analysis.corpus.totalTitles} 条标题。不要全文读取 \`03-title-features.json\`。`,
		"",
		"## 硬指标",
		`- 长度：均值 ${analysis.corpus.length.avg} 字，中位 ${analysis.corpus.length.median} 字，P75  ${analysis.corpus.length.p75} 字，P90 ${analysis.corpus.length.p90} 字，最长 ${analysis.corpus.length.max} 字。`,
		`- 长度分布：${Object.entries(analysis.corpus.length.distribution)
			.map(([k, v]) => `${k}:${v}`)
			.join(" ")}。`,
		`- 分句：均值 ${analysis.corpus.clauses.avg} 句，4句及以上占 ${pctOf(clauseDist, "4句及以上", analysis.corpus.totalTitles)}%。`,
		`- 叹号密度：句末叹号 ${analysis.corpus.punctuation.exclamationEndPct}%，平均每标题 ${analysis.corpus.punctuation.averageExclamationCount} 个叹号。`,
		`- 分隔符频率：${topSeparators}。`,
		`- 实体覆盖率 ${analysis.entities.coveragePct}%，命名实体覆盖率 ${analysis.rhetoric.namedEntityPct}%。`,
		"",
		"## 修辞信号",
		...signalDetail,
		"",
		"## 句式模式",
		`- 高频二元组：${topBigrams}。`,
		`- 高频开头：${topOpeningHooks}。`,
		`- 高频结尾：${topEndingHooks}。`,
		"",
		"## 生成配方",
		...analysis.generation.recommendedFormulas.map((formula) => `- ${formula}`),
		"",
		"## 高频词汇",
		`- 实体：${joinWords(analysis.generation.vocabulary.entities.filter(isGoodEntity).slice(0, 20))}`,
		`- 情绪词：${joinWords(analysis.generation.vocabulary.emotion.slice(0, 16))}`,
		`- 荒诞意象：${joinWords(analysis.generation.vocabulary.imagery.slice(0, 16))}`,
		`- 动作词：${joinWords(analysis.generation.vocabulary.actions.slice(0, 14))}`,
		`- 后果词：${joinWords(analysis.generation.vocabulary.consequences.slice(0, 12))}`,
		`- 人物：${joinWords(analysis.entities.people.filter(isGoodPerson).slice(0, 8))}`,
		`- 模型：${joinWords(analysis.entities.modelVersions.slice(0, 14))}`,
		"",
		"## 情绪极值样本",
		...extremeSamples,
		...(shortStr ? ["", "## 短标题样本（≤48字）", shortStr] : []),
		"",
		"## 硬约束",
		...analysis.generation.writingConstraints.map((rule) => `- ${rule}`),
	].join("\n");
}

function joinWords(words: [string, number][]): string {
	return words.length > 0 ? words.map(([word]) => word).join("、") : "暂无";
}

function pctOf(
	distribution: Record<string, number>,
	key: string,
	total: number,
): string {
	const count = distribution[key] ?? 0;
	return total === 0 ? "0" : ((count / total) * 100).toFixed(1);
}

function isGoodEntity(entry: [string, number]): boolean {
	return !entityBlocklist.has(entry[0]);
}

function isGoodPerson(entry: [string, number]): boolean {
	return !nonPersonEntities.has(entry[0].toLowerCase());
}
