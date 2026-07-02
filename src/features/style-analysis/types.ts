/**
 * @module
 *
 * Type definitions for style analysis results.
 *
 * {@link StyleAnalysis} is the root output — serialized to YAML for caching,
 * consumed by report rendering and SKILL.md generation.
 */
import type { VideoEntry } from "../video-titles/types.ts";

/** `[word, count]` tuple, sorted by count desc. */
export type WordCount = [word: string, count: number];

export interface ScoredTitle {
	title: string;
	score: number;
	matchedWords: string[];
	level: string;
}

export interface CategorySummary {
	count: number;
	pct: number;
	examples: string[];
}

export interface TemporalSummary {
	period: string;
	titleCount: number;
	avgLength: number;
	avgEmotionScore: number;
	dominantCategory: string;
}

export interface StyleAnalysis {
	meta: {
		creator: string;
		uid: string;
		totalVideos: number;
		analysisDate: string;
		source: string;
	};
	length: {
		avg: number;
		min: number;
		max: number;
		median: number;
		p75: number;
		p90: number;
		over40Pct: number;
		distribution: Record<string, number>;
	};
	punctuation: {
		exclamationEndPct: number;
		questionEndPct: number;
		averageExclamationCount: number;
		averageSeparatorCount: number;
		separatorUsage: WordCount[];
	};
	numbers: {
		withNumberPct: number;
		common: WordCount[];
	};
	keywords: {
		emotion: WordCount[];
		topics: WordCount[];
		highFrequency: WordCount[];
		tfidf: WordCount[];
		bigrams: WordCount[];
		trigrams: WordCount[];
	};
	entities: {
		english: WordCount[];
		brandsAndProducts: WordCount[];
		people: WordCount[];
	};
	emotion: {
		avgScore: number;
		distribution: Record<string, number>;
		topTitles: ScoredTitle[];
	};
	rhetoric: {
		questionPct: number;
		exclamationPct: number;
		contrastPct: number;
		roundupPct: number;
		namedEntityPct: number;
	};
	structure: {
		avgClauses: number;
		clauseDistribution: Record<string, number>;
		categories: Record<string, CategorySummary>;
		commonTemplates: WordCount[];
		openingHooks: WordCount[];
		endingHooks: WordCount[];
	};
	temporal: TemporalSummary[];
	examples: VideoEntry[];
}
