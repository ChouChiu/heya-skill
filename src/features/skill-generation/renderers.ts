/**
 * @module
 *
 * Rendering helpers for SKILL.md auto sections.
 */

import { joinWords } from "../../shared/text.ts";
import type { StyleAnalysis } from "../style-analysis/types.ts";

export function renderCoreFeatures(analysis: StyleAnalysis): string {
	const topSignal = Object.entries(analysis.rhetoric.signals).sort(
		(a, b) => b[1].count - a[1].count,
	)[0];

	return [
		"## 核心特征",
		"",
		`- NLP 引擎：${analysis.nlp.backend} 分词/POS/NER，样本 ${analysis.corpus.totalTitles} 条。`,
		`- 标题长度：平均 ${analysis.corpus.length.avg} 字，P75 ${analysis.corpus.length.p75} 字，P90 ${analysis.corpus.length.p90} 字；${analysis.corpus.length.over40Pct}% 超过 40 字。`,
		`- 信息密度：平均 ${analysis.corpus.clauses.avg} 个分句，平均 ${analysis.corpus.punctuation.averageSeparatorCount} 个分隔符。`,
		`- 情绪强度：${analysis.corpus.punctuation.exclamationEndPct}% 以感叹号收尾，${analysis.rhetoric.questionPct}% 使用疑问钩子。`,
		`- 实体钩子：${analysis.entities.coveragePct}% 带实体；高频实体包括 ${joinWords(analysis.generation.vocabulary.entities.slice(0, 12))}。`,
		topSignal
			? `- 主导结构：「${topSignal[0]}」命中 ${topSignal[1].pct}%，常与实体、动作、荒诞意象和行业后果组合。`
			: "- 主导结构：多标签混合，优先保留长标题和多事件压缩。",
	].join("\n");
}

export function renderTitleExamples(analysis: StyleAnalysis): string {
	return [
		"## 近期真实标题示例",
		"",
		...analysis.corpus.examples.recent
			.slice(0, 12)
			.map((video) => `- ${video.title}`),
	].join("\n");
}

export function renderVocabLibrary(analysis: StyleAnalysis): string {
	return [
		"## 词汇库",
		"",
		`- 情绪词：${joinWords(analysis.generation.vocabulary.emotion)}`,
		`- 荒诞意象：${joinWords(analysis.generation.vocabulary.imagery)}`,
		`- 动作词：${joinWords(analysis.generation.vocabulary.actions)}`,
		`- 后果词：${joinWords(analysis.generation.vocabulary.consequences)}`,
		`- 实体名：${joinWords(analysis.generation.vocabulary.entities)}`,
		`- 高频 Token：${joinWords(analysis.lexicon.highFrequency.slice(0, 20))}`,
		`- 二元短语：${joinWords(analysis.phrases.bigrams.slice(0, 15))}`,
		`- 三元短语：${joinWords(analysis.phrases.trigrams.slice(0, 15))}`,
		`- 跨 Token 搭配：${joinWords(analysis.phrases.crossToken.slice(0, 12))}`,
	].join("\n");
}

export function renderStructureFormulas(analysis: StyleAnalysis): string {
	const signals = Object.entries(analysis.rhetoric.signals)
		.sort((a, b) => b[1].count - a[1].count)
		.map(([id, summary]) => `- ${id}: ${summary.pct}%`);

	return [
		"样本修辞信号命中率：",
		...signals,
		"",
		"推荐公式：",
		...analysis.generation.recommendedFormulas.map(
			(formula, index) => `${index + 1}. ${formula}`,
		),
		"",
		`常见开头钩子：${joinWords(analysis.phrases.openingHooks)}`,
		`常见结尾钩子：${joinWords(analysis.phrases.endingHooks)}`,
		`常见分隔符：${joinWords(analysis.corpus.punctuation.separatorUsage)}`,
		"",
		"写作硬约束：",
		...analysis.generation.writingConstraints.map((rule) => `- ${rule}`),
	].join("\n");
}
