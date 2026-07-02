/**
 * @module
 *
 * Deterministic style analysis engine.
 *
 * Ingests normalized video titles and produces a {@link StyleAnalysis}
 * covering: length stats, punctuation, keywords (segmented + dictionary),
 * TF‑IDF, n‑grams, entities, emotion scoring, rhetorical device counts,
 * clause structure, temporal trends, and category classification.
 *
 * All algorithms are deterministic — no randomness, no ML.
 */
import type { VideoEntry } from "../video-titles/types.ts";
import {
	brandWords,
	categoryRules,
	emotionWords,
	peopleWords,
	separators,
	topicWords,
} from "./rules.ts";
import { computeTFIDF, extractWordNgrams, segmentWords } from "./tokenize.ts";
import type {
	CategorySummary,
	ScoredTitle,
	StyleAnalysis,
	TemporalSummary,
	WordCount,
} from "./types.ts";

type EmotionLevel = "极强" | "强烈" | "中等" | "轻微" | "无";

/**
 * Run full style analysis on a set of video titles.
 *
 * @param videos - Normalized video entries (must be non‑empty).
 * @param uid - Bilibili user ID for metadata.
 * @returns Complete style analysis.
 * @throws If `videos` is empty.
 */
export function analyzeStyle(videos: VideoEntry[], uid: string): StyleAnalysis {
	if (videos.length === 0) {
		throw new Error("Cannot analyze an empty video list");
	}

	const titles = videos.map((video) => video.title);
	const lengths = titles
		.map((title) => [...title].length)
		.sort((a, b) => a - b);
	const categories = Object.fromEntries(
		categoryRules.map((rule) => [
			rule.name,
			{
				count: 0,
				pct: 0,
				examples: [] as string[],
			},
		]),
	);
	categories["其他"] = { count: 0, pct: 0, examples: [] };

	for (const title of titles) {
		let matched = false;
		for (const rule of categoryRules) {
			if (!rule.pattern.test(title)) continue;
			const summary = categories[rule.name];
			if (!summary) continue;
			summary.count += 1;
			if (summary.examples.length < 5) summary.examples.push(title);
			matched = true;
		}
		if (!matched) {
			categories["其他"].count += 1;
			if (categories["其他"].examples.length < 5)
				categories["其他"].examples.push(title);
		}
	}

	for (const summary of Object.values(categories)) {
		summary.pct = roundPct(summary.count, titles.length);
	}
	const emotion = analyzeEmotion(titles);

	return {
		meta: {
			creator: "黑鸦",
			uid,
			totalVideos: videos.length,
			analysisDate: new Date().toISOString().slice(0, 10),
			source: "Bilibili official API",
		},
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
		numbers: analyzeNumbers(titles),
		keywords: {
			emotion: countDictionaryHits(titles, emotionWords, 20),
			topics: countDictionaryHits(titles, topicWords, 20),
			highFrequency: countSegmentedTerms(titles, 30),
			tfidf: computeTFIDF(titles, 30),
			bigrams: wordNgramsToKeywords(extractWordNgrams(titles, 2, 30)),
			trigrams: wordNgramsToKeywords(extractWordNgrams(titles, 3, 30)),
		},
		entities: {
			english: countEnglishEntities(titles, 20),
			brandsAndProducts: countDictionaryHits(titles, brandWords, 30),
			people: countDictionaryHits(titles, peopleWords, 20),
		},
		emotion,
		rhetoric: {
			questionPct: roundPct(
				titles.filter((title) => /[？?]/.test(title)).length,
				titles.length,
			),
			exclamationPct: roundPct(
				titles.filter((title) => /[！!]/.test(title)).length,
				titles.length,
			),
			contrastPct: roundPct(
				titles.filter((title) =>
					/却|但是|反而|大战|硬刚|超越|击败|不敌|挑战/.test(title),
				).length,
				titles.length,
			),
			roundupPct: roundPct(
				titles.filter((title) => /日报|周报|盘点|合集|汇总|\|/.test(title))
					.length,
				titles.length,
			),
			namedEntityPct: roundPct(
				titles.filter((title) =>
					[...brandWords, ...peopleWords].some((word) =>
						title.toLowerCase().includes(word.toLowerCase()),
					),
				).length,
				titles.length,
			),
		},
		structure: {
			avgClauses: round(
				mean(
					titles.map((title) => title.split(separators).filter(Boolean).length),
				),
				1,
			),
			clauseDistribution: clauseDistribution(titles),
			categories,
			commonTemplates: countTemplates(titles),
			openingHooks: countHooks(titles, "opening"),
			endingHooks: countHooks(titles, "ending"),
		},
		temporal: analyzeTemporal(videos, categories),
		examples: videos.slice(0, 12),
	};
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
			separatorCounts.set(separator, (separatorCounts.get(separator) ?? 0) + 1);
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

function analyzeNumbers(titles: string[]) {
	const withNumber = titles.filter((title) => /\d/.test(title)).length;
	const counts = new Map<string, number>();

	for (const title of titles) {
		for (const number of title.match(/\d+/g) ?? []) {
			counts.set(number, (counts.get(number) ?? 0) + 1);
		}
	}

	return {
		withNumberPct: roundPct(withNumber, titles.length),
		common: sortCounts(counts, 10),
	};
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

function countSegmentedTerms(titles: string[], limit: number): WordCount[] {
	const counts = new Map<string, number>();

	for (const title of titles) {
		for (const word of segmentWords(title)) {
			counts.set(word, (counts.get(word) ?? 0) + 1);
		}
	}

	return sortCounts(counts, limit);
}

function countEnglishEntities(titles: string[], limit: number): WordCount[] {
	const counts = new Map<string, number>();
	for (const title of titles) {
		for (const token of title.match(/[A-Z][A-Za-z0-9.+-]{1,}/g) ?? []) {
			counts.set(token, (counts.get(token) ?? 0) + 1);
		}
	}
	return sortCounts(counts, limit);
}

function wordNgramsToKeywords(
	ngrams: { phrase: string; count: number }[],
): WordCount[] {
	return ngrams.map(({ phrase, count }) => [phrase, count] as WordCount);
}

function analyzeEmotion(titles: string[]): StyleAnalysis["emotion"] {
	const distribution: Record<EmotionLevel, number> = {
		极强: 0,
		强烈: 0,
		中等: 0,
		轻微: 0,
		无: 0,
	};
	const scored: ScoredTitle[] = [];

	for (const title of titles) {
		const matchedWords = emotionWords.filter((word) => title.includes(word));
		const punctuationBoost = Math.min(title.match(/[！!]/g)?.length ?? 0, 3);
		const questionBoost = /[？?]/.test(title) ? 0.5 : 0;
		const score = round(
			matchedWords.length * 1.5 + punctuationBoost + questionBoost,
			1,
		);
		const level = emotionLevel(score);
		distribution[level] += 1;
		scored.push({ title, score, matchedWords, level });
	}

	return {
		avgScore: round(mean(scored.map((item) => item.score)), 2),
		distribution,
		topTitles: scored.sort((a, b) => b.score - a.score).slice(0, 10),
	};
}

function emotionLevel(score: number): EmotionLevel {
	if (score >= 5) return "极强";
	if (score >= 3.5) return "强烈";
	if (score >= 2) return "中等";
	if (score > 0) return "轻微";
	return "无";
}

function countTemplates(titles: string[]): WordCount[] {
	const counts = new Map<string, number>();
	for (const title of titles) {
		const template = title
			.replace(/[A-Za-z][A-Za-z0-9.+-]*/g, "{EN}")
			.replace(/\d+/g, "{NUM}")
			.replace(/[\u4e00-\u9fff]{2,}/g, "{CN}")
			.replace(/\s+/g, " ")
			.slice(0, 80);
		counts.set(template, (counts.get(template) ?? 0) + 1);
	}
	return sortCounts(counts, 10);
}

function countHooks(
	titles: string[],
	position: "opening" | "ending",
): WordCount[] {
	const counts = new Map<string, number>();
	for (const title of titles) {
		const parts = title
			.split(separators)
			.map((part) => part.trim())
			.filter(Boolean);
		const hook = position === "opening" ? parts[0] : parts.at(-1);
		if (!hook) continue;
		const normalized = hook.slice(0, 18);
		counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
	}
	return sortCounts(counts, 12);
}

function clauseDistribution(titles: string[]): Record<string, number> {
	const distribution = {
		"1句": 0,
		"2句": 0,
		"3句": 0,
		"4句及以上": 0,
	};
	for (const title of titles) {
		const count = title.split(separators).filter(Boolean).length;
		if (count <= 1) distribution["1句"] += 1;
		else if (count === 2) distribution["2句"] += 1;
		else if (count === 3) distribution["3句"] += 1;
		else distribution["4句及以上"] += 1;
	}
	return distribution;
}

function analyzeTemporal(
	videos: VideoEntry[],
	allCategories: Record<string, CategorySummary>,
): TemporalSummary[] {
	const byMonth = new Map<string, VideoEntry[]>();
	for (const video of videos) {
		const period = video.createdDate.slice(0, 7);
		const bucket = byMonth.get(period) ?? [];
		bucket.push(video);
		byMonth.set(period, bucket);
	}

	return [...byMonth.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.slice(-12)
		.map(([period, periodVideos]) => {
			const periodTitles = periodVideos.map((video) => video.title);
			const periodCategories = classifyCategories(periodTitles);
			const dominantCategory =
				Object.entries(periodCategories).sort(
					(a, b) => b[1].count - a[1].count,
				)[0]?.[0] ??
				Object.entries(allCategories).sort(
					(a, b) => b[1].count - a[1].count,
				)[0]?.[0] ??
				"其他";

			return {
				period,
				titleCount: periodVideos.length,
				avgLength: round(
					mean(periodTitles.map((title) => [...title].length)),
					1,
				),
				avgEmotionScore: analyzeEmotion(periodTitles).avgScore,
				dominantCategory,
			};
		});
}

function classifyCategories(titles: string[]): Record<string, CategorySummary> {
	const categories = Object.fromEntries(
		categoryRules.map((rule) => [
			rule.name,
			{ count: 0, pct: 0, examples: [] as string[] },
		]),
	);
	categories["其他"] = { count: 0, pct: 0, examples: [] };

	for (const title of titles) {
		let matched = false;
		for (const rule of categoryRules) {
			if (!rule.pattern.test(title)) continue;
			const summary = categories[rule.name];
			if (!summary) continue;
			summary.count += 1;
			matched = true;
		}
		if (!matched) categories["其他"].count += 1;
	}

	for (const summary of Object.values(categories)) {
		summary.pct = roundPct(summary.count, titles.length);
	}
	return categories;
}

function lengthDistribution(lengths: number[]): Record<string, number> {
	return {
		"20字以内": lengths.filter((value) => value <= 20).length,
		"21-30字": lengths.filter((value) => value > 20 && value <= 30).length,
		"31-40字": lengths.filter((value) => value > 30 && value <= 40).length,
		"40字以上": lengths.filter((value) => value > 40).length,
	};
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
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits: number): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

function roundPct(count: number, total: number): number {
	return round((count / total) * 100, 1);
}
