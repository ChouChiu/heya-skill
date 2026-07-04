/**
 * @module
 *
 * Type definitions for neural NLP backed style analysis.
 */
import type { VideoEntry } from "../video-titles/types.ts";

/** `[item, count]` tuple, sorted by count desc. */
export type WordCount = [item: string, count: number];

export interface Token {
	text: string;
	normalized: string;
	start?: number;
	end?: number;
	pos?: string;
	source: "hanlp" | "domain";
}

export interface EntityMention {
	text: string;
	type: string;
	start?: number;
	end?: number;
	confidence?: number;
	source: "hanlp" | "domain" | "dictionary";
}

export interface TitleSignal {
	id: string;
	label: string;
	matched: string[];
}

export interface TitleFeature {
	bvid: string;
	title: string;
	date: string;
	clauses: string[];
	tokens: Token[];
	entities: EntityMention[];
	signals: TitleSignal[];
	categoryIds: string[];
	emotionScore: number;
}

export interface NlpDocument {
	text: string;
	tokens: Token[];
	entities: EntityMention[];
}

export interface NlpBackend {
	name: "hanlp";
	tasks: string[];
	checkHealth(): Promise<void>;
	analyze(texts: string[]): Promise<NlpDocument[]>;
}

export interface CategorySummary {
	count: number;
	pct: number;
	examples: string[];
}

export interface LengthSummary {
	avg: number;
	min: number;
	max: number;
	median: number;
	p75: number;
	p90: number;
	over40Pct: number;
	distribution: Record<string, number>;
}

export interface PunctuationSummary {
	exclamationEndPct: number;
	questionEndPct: number;
	averageExclamationCount: number;
	averageSeparatorCount: number;
	separatorUsage: WordCount[];
}

export interface StyleAnalysis {
	nlp: {
		backend: "hanlp";
		tasks: string[];
		batchSize: number;
		failureCount: number;
		generatedAt: string;
	};
	corpus: {
		creator: string;
		uid: string;
		totalTitles: number;
		dateRange: {
			oldest: string;
			newest: string;
		};
		source: string;
		length: LengthSummary;
		punctuation: PunctuationSummary;
		clauses: {
			avg: number;
			distribution: Record<string, number>;
		};
		examples: {
			recent: VideoEntry[];
			mostEmotional: string[];
		};
	};
	entities: {
		coveragePct: number;
		brandsAndProducts: WordCount[];
		people: WordCount[];
		organizations: WordCount[];
		modelVersions: WordCount[];
		english: WordCount[];
		fromNer: Record<string, WordCount[]>;
	};
	lexicon: {
		highFrequency: WordCount[];
		domainTerms: WordCount[];
		emotionWords: WordCount[];
		stopWordsFiltered: number;
	};
	phrases: {
		bigrams: WordCount[];
		trigrams: WordCount[];
		crossToken: WordCount[];
		openingHooks: WordCount[];
		endingHooks: WordCount[];
		imagery: WordCount[];
	};
	rhetoric: {
		questionPct: number;
		exclamationPct: number;
		contrastPct: number;
		roundupPct: number;
		namedEntityPct: number;
		signals: Record<string, CategorySummary>;
	};
	generation: {
		recommendedFormulas: string[];
		vocabulary: {
			emotion: WordCount[];
			imagery: WordCount[];
			actions: WordCount[];
			consequences: WordCount[];
			entities: WordCount[];
		};
		representativeTitles: string[];
		writingConstraints: string[];
	};
}

export interface StyleAnalysisResult {
	analysis: StyleAnalysis;
	features: TitleFeature[];
}
