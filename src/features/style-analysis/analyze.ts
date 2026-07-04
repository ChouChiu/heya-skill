/**
 * @module
 *
 * Deterministic style aggregation over HanLP lexical analysis.
 */

import { normalizeTokenText } from "../../shared/text.ts";
import type { VideoEntry } from "../video-titles/types.ts";
import {
	brandWords,
	consequenceWords,
	domainStopWords,
	emotionWords,
	imageryWords,
	peopleWords,
	separators,
	styleActionWords,
	topicWords,
} from "./rules.ts";
import type {
	CategorySummary,
	EntityMention,
	NlpBackend,
	NlpDocument,
	StyleAnalysis,
	StyleAnalysisResult,
	TitleFeature,
	TitleSignal,
	Token,
	WordCount,
} from "./types.ts";

export interface AnalyzeStyleOptions {
	uid: string;
	backend: NlpBackend;
	batchSize: number;
	now?: Date;
}

interface SignalRule {
	id: string;
	label: string;
	pattern: RegExp;
}

export const signalRules: SignalRule[] = [
	{ id: "daily", label: "日报式", pattern: /AI\s*日报|日报|\|\s*AI/i },
	{
		id: "emotion_burst",
		label: "情绪爆点",
		pattern: new RegExp(`${escapeRegexList(emotionWords)}|！|!`),
	},
	{
		id: "multi_event",
		label: "多事件合并",
		pattern: /[；;｜|].*[；;｜|]|，.*，|；|;/,
	},
	{ id: "number_hook", label: "数字悬念", pattern: /\d+|首次|第一|万|亿/ },
	{
		id: "contrast",
		label: "对比冲突",
		pattern: /却|但是|反而|大战|硬刚|超越|击败|不敌|挑战|狙击|对决/,
	},
	{
		id: "absurd_imagery",
		label: "荒诞意象",
		pattern: new RegExp(escapeRegexList(imageryWords)),
	},
];

const protectedSpanPatterns = [
	/AI\s*日报/gi,
	/AI圈/g,
	/Token\s+Plan/gi,
	/GPT[-\s]?\d+(?:\.\d+)*(?:\s*(?:Pro|Flash|Max|Mini|Code|Lite|Plus))?/gi,
	/DeepSeek[-\s]?V?\d+(?:\.\d+)*/gi,
	/Gemini\s+\d+(?:\.\d+)*(?:\s*(?:Pro|Flash|Max|Ultra))?/gi,
	/[A-Z][A-Za-z0-9]*(?:[-\s]\d+(?:\.\d+)*)(?:\s*(?:Pro|Flash|Max|Mini|Code|Lite|Plus))?/g,
	/椅子爆炸|集体判处死刑|斩杀线来了|瘫坐在核弹上|开错生死簿/g,
];

export async function analyzeStyle(
	videos: VideoEntry[],
	options: AnalyzeStyleOptions,
): Promise<StyleAnalysisResult> {
	if (videos.length === 0) {
		throw new Error("Cannot analyze an empty video list");
	}

	const titles = videos.map((video) => video.title);
	const docs = await analyzeInBatches(
		titles,
		options.backend,
		options.batchSize,
	);
	const features = videos.map((video, index) =>
		buildTitleFeature(video, docs[index] ?? emptyDoc(video.title)),
	);
	const analysis = aggregateStyleAnalysis(videos, features, options);
	return { analysis, features };
}

export function buildTitleFeature(
	video: VideoEntry,
	document: NlpDocument,
): TitleFeature {
	const title = video.title;
	const tokens = applyDomainProtection(title, document.tokens);
	const entities = enrichEntities(title, document.entities, tokens);
	const signals = matchSignals(title);
	const categoryIds = signals.map((signal) => signal.id);
	const emotionScore = scoreEmotion(title);

	return {
		bvid: video.bvid,
		title,
		date: video.createdDate,
		clauses: splitClauses(title),
		tokens,
		entities,
		signals,
		categoryIds,
		emotionScore,
	};
}

async function analyzeInBatches(
	titles: string[],
	backend: NlpBackend,
	batchSize: number,
): Promise<NlpDocument[]> {
	const docs: NlpDocument[] = [];
	for (let i = 0; i < titles.length; i += batchSize) {
		const batch = titles.slice(i, i + batchSize);
		docs.push(...(await backend.analyze(batch)));
	}
	return docs;
}

function aggregateStyleAnalysis(
	videos: VideoEntry[],
	features: TitleFeature[],
	options: AnalyzeStyleOptions,
): StyleAnalysis {
	const titles = videos.map((video) => video.title);
	const lengths = computeSortedLengths(titles);
	const { tokenCounts, stopWordsFiltered } = computeTokenCounts(features);

	const entityCounts = countEntities(features);
	const signals = summarizeSignals(features);
	const emotionRanked = [...features]
		.sort((a, b) => b.emotionScore - a.emotionScore)
		.slice(0, 10)
		.map((feature) => feature.title);
	const representativeTitles = chooseRepresentativeTitles(features);
	const topEntities = mergeWordCounts(
		entityCounts.brandsAndProducts,
		entityCounts.people,
		entityCounts.modelVersions,
		entityCounts.organizations,
	).slice(0, 24);

	return {
		nlp: {
			backend: options.backend.name,
			tasks: options.backend.tasks,
			batchSize: options.batchSize,
			failureCount: 0,
			generatedAt: (options.now ?? new Date()).toISOString(),
		},
		corpus: {
			creator: "黑鸦",
			uid: options.uid,
			totalTitles: videos.length,
			dateRange: getDateRange(videos),
			source: "UApi Bilibili proxy + HanLP REST",
			length: {
				avg: round(mean(lengths), 1),
				min: lengths[0] ?? 0,
				max: lengths.at(-1) ?? 0,
				median: lengths[Math.floor(lengths.length / 2)] ?? 0,
				p75: percentile(lengths, 0.75),
				p90: percentile(lengths, 0.9),
				over40Pct: roundPct(
					lengths.filter((value) => value > 40).length,
					lengths.length,
				),
				distribution: lengthDistribution(lengths),
			},
			punctuation: analyzePunctuation(titles),
			clauses: {
				avg: round(mean(features.map((feature) => feature.clauses.length)), 1),
				distribution: clauseDistribution(features),
			},
			examples: {
				recent: videos.slice(0, 12),
				mostEmotional: emotionRanked,
			},
		},
		entities: {
			coveragePct: roundPct(
				features.filter((feature) => feature.entities.length > 0).length,
				features.length,
			),
			...entityCounts,
		},
		lexicon: {
			highFrequency: sortCounts(tokenCounts, 40),
			domainTerms: countDictionaryHits(titles, topicWords, 30),
			emotionWords: countDictionaryHits(titles, emotionWords, 30),
			stopWordsFiltered,
		},
		phrases: {
			bigrams: extractNgrams(features, 2, 30),
			trigrams: extractNgrams(features, 3, 30),
			crossToken: extractCrossTokenPhrases(features, 30),
			openingHooks: countHooks(features, "opening"),
			endingHooks: countHooks(features, "ending"),
			imagery: countDictionaryHits(titles, imageryWords, 30),
		},
		rhetoric: {
			questionPct: roundPct(
				titles.filter((title) => /[？?]/.test(title)).length,
				titles.length,
			),
			exclamationPct: roundPct(
				titles.filter((title) => /[！!]/.test(title)).length,
				titles.length,
			),
			contrastPct: signals.contrast?.pct ?? 0,
			roundupPct: signals.daily?.pct ?? 0,
			namedEntityPct: roundPct(
				features.filter((feature) =>
					feature.entities.some((entity) =>
						["brand", "person", "organization", "model"].includes(
							entity.type.toLowerCase(),
						),
					),
				).length,
				features.length,
			),
			signals,
		},
		generation: {
			recommendedFormulas: [
				"{最强实体} + {突然/重磅/炸裂} + {动作}，{对手/行业} + {荒诞反应/后果}！",
				"{事件A}；{事件B}；{事件C}，{集体命运/斩杀线}！| AI日报MMDD",
				"{人物/CEO} 瘫坐在{核弹/椅子}上，仿佛看到了{椅子爆炸/行业毁灭}！",
				"{模型/产品} + {炼化/夺舍/祭出/龙王归来} + {对手/行业}，{用户/开发者} 已被{判处死刑/踢出群聊}！",
			],
			vocabulary: {
				emotion: countDictionaryHits(titles, emotionWords, 30),
				imagery: countDictionaryHits(titles, imageryWords, 30),
				actions: countDictionaryHits(titles, styleActionWords, 30),
				consequences: countDictionaryHits(titles, consequenceWords, 30),
				entities: topEntities,
			},
			representativeTitles,
			writingConstraints: [
				"保留用户给出的事实，不编造新公司、新数据或确定性结论。",
				"标题优先 4 个以上分句，用 ！、；、，、| 压缩多个事件。",
				"至少组合实体、动作、荒诞意象、行业后果四类信息。",
				"不确定消息使用“或将、疑似、被曝、传出”等语气。",
			],
		},
	};
}

function computeSortedLengths(titles: string[]): number[] {
	return titles.map((title) => [...title].length).sort((a, b) => a - b);
}

function computeTokenCounts(features: TitleFeature[]): {
	tokenCounts: Map<string, number>;
	stopWordsFiltered: number;
} {
	const tokenCounts = new Map<string, number>();
	let stopWordsFiltered = 0;

	for (const feature of features) {
		for (const token of feature.tokens) {
			const normalized = token.normalized;
			if (!normalized || normalized.length < 2) continue;
			if (domainStopWords.has(normalized) || domainStopWords.has(token.text)) {
				stopWordsFiltered += 1;
				continue;
			}
			tokenCounts.set(token.text, (tokenCounts.get(token.text) ?? 0) + 1);
		}
	}

	return { tokenCounts, stopWordsFiltered };
}

export function applyDomainProtection(title: string, tokens: Token[]): Token[] {
	const protectedTokens = findProtectedSpans(title);
	const merged = tokens.filter(
		(token) =>
			!protectedTokens.some(
				(protectedToken) =>
					token.start !== undefined &&
					token.end !== undefined &&
					protectedToken.start !== undefined &&
					protectedToken.end !== undefined &&
					token.start >= protectedToken.start &&
					token.end <= protectedToken.end,
			),
	);

	return [...merged, ...protectedTokens].sort((a, b) => {
		const aStart = a.start ?? Number.MAX_SAFE_INTEGER;
		const bStart = b.start ?? Number.MAX_SAFE_INTEGER;
		return aStart - bStart || b.text.length - a.text.length;
	});
}

function findProtectedSpans(title: string): Token[] {
	const seen = new Set<string>();
	const spans: Token[] = [];

	for (const pattern of protectedSpanPatterns) {
		pattern.lastIndex = 0;
		for (const match of title.matchAll(pattern)) {
			const text = match[0]?.trim();
			if (!text) continue;
			const start = [...title.slice(0, match.index ?? 0)].length;
			const key = `${start}:${text}`;
			if (seen.has(key)) continue;
			seen.add(key);
			spans.push({
				text,
				normalized: normalizeTokenText(text),
				start,
				end: start + [...text].length,
				source: "domain",
			});
		}
	}

	return spans;
}

function enrichEntities(
	title: string,
	entities: EntityMention[],
	tokens: Token[],
): EntityMention[] {
	const enriched = [...entities];

	for (const word of brandWords)
		addDictionaryEntity(title, enriched, word, "brand");
	for (const word of peopleWords)
		addDictionaryEntity(title, enriched, word, "person");
	for (const token of tokens) {
		if (isModelVersion(token.text)) {
			enriched.push({
				text: token.text,
				type: "model",
				start: token.start,
				end: token.end,
				source: "domain",
			});
		}
	}

	return dedupeEntities(enriched);
}

function addDictionaryEntity(
	title: string,
	entities: EntityMention[],
	word: string,
	type: string,
): void {
	const index = title.toLowerCase().indexOf(word.toLowerCase());
	if (index < 0) return;
	const start = [...title.slice(0, index)].length;
	entities.push({
		text: word,
		type,
		start,
		end: start + [...word].length,
		source: "dictionary",
	});
}

function dedupeEntities(entities: EntityMention[]): EntityMention[] {
	const seen = new Set<string>();
	return entities.filter((entity) => {
		const key = `${entity.text.toLowerCase()}:${entity.type.toLowerCase()}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function matchSignals(title: string): TitleSignal[] {
	return signalRules.flatMap((rule): TitleSignal[] => {
		if (!rule.pattern.test(title)) return [];
		rule.pattern.lastIndex = 0;
		return [
			{
				id: rule.id,
				label: rule.label,
				matched: [rule.label],
			},
		];
	});
}

function scoreEmotion(title: string): number {
	const matchedWords = emotionWords.filter((word) => title.includes(word));
	const imageryBoost = imageryWords.filter((word) =>
		title.includes(word),
	).length;
	const punctuationBoost = Math.min(title.match(/[！!]/g)?.length ?? 0, 3);
	const questionBoost = /[？?]/.test(title) ? 0.5 : 0;
	return round(
		matchedWords.length * 1.4 +
			imageryBoost * 1.2 +
			punctuationBoost +
			questionBoost,
		1,
	);
}

function countEntities(
	features: TitleFeature[],
): Omit<StyleAnalysis["entities"], "coveragePct"> {
	const brands = new Map<string, number>();
	const people = new Map<string, number>();
	const organizations = new Map<string, number>();
	const models = new Map<string, number>();
	const english = new Map<string, number>();
	const nerBuckets = new Map<string, Map<string, number>>();

	for (const feature of features) {
		for (const token of feature.tokens) {
			for (const match of token.text.match(/[A-Z][A-Za-z0-9.+-]{1,}/g) ?? []) {
				english.set(match, (english.get(match) ?? 0) + 1);
			}
		}
		for (const entity of feature.entities) {
			const type = entity.type.toLowerCase();
			if (type.includes("person") || type === "nr" || type === "per") {
				increment(people, entity.text);
			} else if (type.includes("org") || type.includes("organization")) {
				increment(organizations, entity.text);
			} else if (type === "brand") {
				increment(brands, entity.text);
			} else if (type === "model") {
				increment(models, entity.text);
			}

			const bucket = nerBuckets.get(entity.type) ?? new Map<string, number>();
			increment(bucket, entity.text);
			nerBuckets.set(entity.type, bucket);
		}
	}

	const fromNer = Object.fromEntries(
		[...nerBuckets.entries()].map(([type, counts]) => [
			type,
			sortCounts(counts, 20),
		]),
	);

	return {
		brandsAndProducts: sortCounts(brands, 30),
		people: sortCounts(people, 20),
		organizations: sortCounts(organizations, 20),
		modelVersions: sortCounts(models, 30),
		english: sortCounts(english, 30),
		fromNer,
	};
}

function summarizeSignals(
	features: TitleFeature[],
): Record<string, CategorySummary> {
	const summaries = Object.fromEntries(
		signalRules.map((rule) => [
			rule.id,
			{ count: 0, pct: 0, examples: [] as string[] },
		]),
	);

	for (const feature of features) {
		for (const signal of feature.signals) {
			const summary = summaries[signal.id];
			if (!summary) continue;
			summary.count += 1;
			if (summary.examples.length < 5) summary.examples.push(feature.title);
		}
	}

	for (const summary of Object.values(summaries)) {
		summary.pct = roundPct(summary.count, features.length);
	}
	return summaries;
}

function extractNgrams(
	features: TitleFeature[],
	size: 2 | 3,
	limit: number,
): WordCount[] {
	const counts = new Map<string, number>();
	for (const feature of features) {
		const words = contentTokens(feature);
		for (let i = 0; i <= words.length - size; i++) {
			const phrase = words.slice(i, i + size).join("");
			if (phrase.length < size * 2) continue;
			increment(counts, phrase);
		}
	}
	return sortCounts(counts, limit);
}

function extractCrossTokenPhrases(
	features: TitleFeature[],
	limit: number,
): WordCount[] {
	const counts = new Map<string, number>();
	for (const feature of features) {
		for (const clause of feature.clauses) {
			for (const word of [
				...topicWords,
				...styleActionWords,
				...imageryWords,
			]) {
				if (clause.includes(word)) increment(counts, clause.slice(0, 28));
			}
		}
	}
	return sortCounts(counts, limit);
}

function countHooks(
	features: TitleFeature[],
	position: "opening" | "ending",
): WordCount[] {
	const counts = new Map<string, number>();
	for (const feature of features) {
		const hook =
			position === "opening" ? feature.clauses[0] : feature.clauses.at(-1);
		if (!hook) continue;
		increment(counts, hook.slice(0, 24));
	}
	return sortCounts(counts, 12);
}

function chooseRepresentativeTitles(features: TitleFeature[]): string[] {
	const chosen = new Map<string, string>();
	for (const feature of [...features].sort(
		(a, b) => b.emotionScore - a.emotionScore,
	)) {
		for (const signal of feature.signals) {
			if (!chosen.has(signal.id)) chosen.set(signal.id, feature.title);
		}
		if (chosen.size >= signalRules.length) break;
	}
	return [...chosen.values()].slice(0, 8);
}

function countDictionaryHits(
	titles: string[],
	dictionary: readonly string[],
	limit: number,
): WordCount[] {
	const counts = new Map<string, number>();
	for (const word of dictionary) {
		const count = titles.filter((title) =>
			title.toLowerCase().includes(word.toLowerCase()),
		).length;
		if (count > 0) counts.set(word, count);
	}
	return sortCounts(counts, limit);
}

function contentTokens(feature: TitleFeature): string[] {
	return feature.tokens
		.map((token) => token.text.trim())
		.filter(
			(token) =>
				token.length >= 2 &&
				!domainStopWords.has(token) &&
				!domainStopWords.has(token.toLowerCase()),
		);
}

function splitClauses(title: string): string[] {
	return title
		.split(separators)
		.map((part) => part.trim())
		.filter(Boolean);
}

function analyzePunctuation(titles: string[]) {
	const exclamationEnd = titles.filter((title) => /[！!]$/.test(title)).length;
	const questionEnd = titles.filter((title) => /[？?]$/.test(title)).length;
	const exclamationCount = titles.reduce(
		(sum, title) => sum + (title.match(/[！!]/g)?.length ?? 0),
		0,
	);
	const separatorCounts = new Map<string, number>();
	let separatorTotal = 0;
	for (const title of titles) {
		for (const separator of title.match(separators) ?? []) {
			separatorTotal += 1;
			increment(separatorCounts, separator);
		}
	}

	return {
		exclamationEndPct: roundPct(exclamationEnd, titles.length),
		questionEndPct: roundPct(questionEnd, titles.length),
		averageExclamationCount: round(exclamationCount / titles.length, 2),
		averageSeparatorCount: round(separatorTotal / titles.length, 2),
		separatorUsage: sortCounts(separatorCounts, 20),
	};
}

function clauseDistribution(features: TitleFeature[]): Record<string, number> {
	const distribution = {
		"1句": 0,
		"2句": 0,
		"3句": 0,
		"4句及以上": 0,
	};
	for (const feature of features) {
		const count = feature.clauses.length;
		if (count <= 1) distribution["1句"] += 1;
		else if (count === 2) distribution["2句"] += 1;
		else if (count === 3) distribution["3句"] += 1;
		else distribution["4句及以上"] += 1;
	}
	return distribution;
}

function getDateRange(videos: VideoEntry[]): {
	oldest: string;
	newest: string;
} {
	const dates = videos
		.map((video) => video.createdDate)
		.filter(Boolean)
		.sort();
	return { oldest: dates[0] ?? "", newest: dates.at(-1) ?? "" };
}

function lengthDistribution(lengths: number[]): Record<string, number> {
	const distribution = {
		"20字以内": 0,
		"21-30字": 0,
		"31-40字": 0,
		"40字以上": 0,
	};
	for (const value of lengths) {
		if (value <= 20) distribution["20字以内"] += 1;
		else if (value <= 30) distribution["21-30字"] += 1;
		else if (value <= 40) distribution["31-40字"] += 1;
		else distribution["40字以上"] += 1;
	}
	return distribution;
}

function emptyDoc(text: string): NlpDocument {
	return { text, tokens: [], entities: [] };
}

function mergeWordCounts(...lists: WordCount[][]): WordCount[] {
	const counts = new Map<string, number>();
	for (const list of lists) {
		for (const [word, count] of list) {
			counts.set(word, (counts.get(word) ?? 0) + count);
		}
	}
	return sortCounts(counts, 100);
}

function increment(counts: Map<string, number>, key: string): void {
	counts.set(key, (counts.get(key) ?? 0) + 1);
}

function sortCounts(counts: Map<string, number>, limit: number): WordCount[] {
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
		.slice(0, limit);
}

function percentile(values: number[], percentileValue: number): number {
	if (values.length === 0) return 0;
	const index = Math.min(
		values.length - 1,
		Math.ceil(values.length * percentileValue) - 1,
	);
	return values[index] ?? 0;
}

function mean(values: number[]): number {
	return values.length === 0
		? 0
		: values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits: number): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

function roundPct(count: number, total: number): number {
	return total === 0 ? 0 : round((count / total) * 100, 1);
}

function isModelVersion(text: string): boolean {
	return /[A-Za-z]+[-\s]?(?:V?\d+(?:\.\d+)*|Pro|Flash|Max|Mini|Code|Lite|Plus)/.test(
		text,
	);
}

function escapeRegexList(words: readonly string[]): string {
	return words
		.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("|");
}
