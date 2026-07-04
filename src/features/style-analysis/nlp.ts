/**
 * @module
 *
 * HanLP REST adapter and response normalization.
 */
import type { EntityMention, NlpBackend, NlpDocument, Token } from "./types.ts";

type FetchFunction = (
	input: Parameters<typeof fetch>[0],
	init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

export interface HanlpBackendOptions {
	url: string;
	timeoutMs: number;
	fetchImpl?: FetchFunction;
}

interface RawEntityObject {
	text?: unknown;
	type?: unknown;
	label?: unknown;
	start?: unknown;
	end?: unknown;
	confidence?: unknown;
	score?: unknown;
}

/**
 * Local HanLP REST backend. The expected endpoint is `${HANLP_URL}/parse`.
 */
export class HanlpBackend implements NlpBackend {
	readonly name = "hanlp" as const;
	readonly tasks = ["tok", "pos", "ner"];

	private readonly url: string;
	private readonly timeoutMs: number;
	private readonly fetchImpl: FetchFunction;

	constructor(options: HanlpBackendOptions) {
		this.url = options.url.replace(/\/+$/, "");
		this.timeoutMs = options.timeoutMs;
		this.fetchImpl = options.fetchImpl ?? fetch;
	}

	async checkHealth(): Promise<void> {
		const healthUrl = `${this.url}/health`;
		const response = await this.request(healthUrl, {
			method: "GET",
		});
		if (!response.ok) {
			throw new Error(
				`HanLP health check failed: ${response.status} ${response.statusText}`,
			);
		}
	}

	async analyze(texts: string[]): Promise<NlpDocument[]> {
		if (texts.length === 0) return [];

		const parseUrl = `${this.url}/parse`;
		const response = await this.request(parseUrl, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ text: texts, tasks: this.tasks }),
		});
		if (!response.ok) {
			throw new Error(
				`HanLP parse failed: ${response.status} ${response.statusText}`,
			);
		}

		return normalizeHanlpResponse(await response.json(), texts);
	}

	private async request(url: string, init: RequestInit): Promise<Response> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);
		try {
			return await this.fetchImpl(url, { ...init, signal: controller.signal });
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				throw new Error(
					`HanLP request timed out after ${this.timeoutMs}ms. Check HANLP_URL or increase HANLP_TIMEOUT_MS.`,
				);
			}
			throw new Error(formatHanlpNetworkError(error));
		} finally {
			clearTimeout(timer);
		}
	}
}

function formatHanlpNetworkError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return [
		`Unable to connect to HanLP: ${message}`,
		"Start the local HanLP REST service, set HANLP_URL to the reachable service, or run `bun pipeline --skip-fetch --skip-analyze` to regenerate SKILL.md from cached analysis.",
	].join(" ");
}

export function normalizeHanlpResponse(
	payload: unknown,
	texts: string[],
): NlpDocument[] {
	const docs = extractDocuments(payload, texts);
	if (docs.length !== texts.length) {
		throw new Error(
			`HanLP returned ${docs.length} documents for ${texts.length} inputs`,
		);
	}

	return docs.map((doc, index) => {
		const text = texts[index] ?? "";
		const rawTokens = readTokenList(doc);
		const rawPos = readPosList(doc);
		const tokens = normalizeTokens(text, rawTokens, rawPos);
		return {
			text,
			tokens,
			entities: readEntities(doc),
		};
	});
}

function normalizeTokens(
	text: string,
	rawTokens: unknown[],
	rawPos: (string | undefined)[],
): Token[] {
	let cursor = 0;
	return rawTokens.map((raw, index) => {
		const token = toToken(text, raw, rawPos[index], cursor);
		if (token.end !== undefined) {
			cursor = Math.max(cursor, token.end);
		}
		return token;
	});
}

function extractDocuments(payload: unknown, texts: string[]): unknown[] {
	if (Array.isArray(payload)) return payload;
	if (!isRecord(payload)) return [];

	const data = payload.data ?? payload.result ?? payload.results ?? payload.doc;
	if (Array.isArray(data)) return data;

	const tok = payload.tok ?? payload.tokens ?? payload["tok/fine"];
	if (Array.isArray(tok) && tok.every(Array.isArray)) {
		return tok.map((tokens, index) => ({
			tok: tokens,
			pos: pickNested(payload.pos ?? payload["pos/ctb"], index),
			ner: pickNested(payload.ner ?? payload["ner/msra"], index),
		}));
	}

	if (texts.length === 1) return [payload];
	return [];
}

function readTokenList(doc: unknown): unknown[] {
	if (!isRecord(doc)) return [];
	const tokens =
		doc.tokens ?? doc.tok ?? doc["tok/fine"] ?? doc["tok/coarse"] ?? [];
	return Array.isArray(tokens) ? tokens : [];
}

function readPosList(doc: unknown): (string | undefined)[] {
	if (!isRecord(doc)) return [];
	const pos = doc.pos ?? doc["pos/ctb"] ?? doc["pos/pku"] ?? [];
	return Array.isArray(pos)
		? pos.map((item) => (typeof item === "string" ? item : undefined))
		: [];
}

function readEntities(doc: unknown): EntityMention[] {
	if (!isRecord(doc)) return [];
	const rawEntities = doc.entities ?? doc.ner ?? doc["ner/msra"] ?? [];
	if (!Array.isArray(rawEntities)) return [];

	return rawEntities.flatMap((raw): EntityMention[] => {
		if (Array.isArray(raw)) {
			const [text, type, start, end, confidence] = raw;
			if (typeof text !== "string") return [];
			return [
				{
					text,
					type: typeof type === "string" ? type : "ENTITY",
					start: numberOrUndefined(start),
					end: numberOrUndefined(end),
					confidence: numberOrUndefined(confidence),
					source: "hanlp",
				},
			];
		}

		if (!isRecord(raw)) return [];
		const entity = raw as RawEntityObject;
		const text = typeof entity.text === "string" ? entity.text : undefined;
		if (!text) return [];
		return [
			{
				text,
				type:
					typeof entity.type === "string"
						? entity.type
						: typeof entity.label === "string"
							? entity.label
							: "ENTITY",
				start: numberOrUndefined(entity.start),
				end: numberOrUndefined(entity.end),
				confidence:
					numberOrUndefined(entity.confidence) ??
					numberOrUndefined(entity.score),
				source: "hanlp",
			},
		];
	});
}

function toToken(
	text: string,
	raw: unknown,
	pos: string | undefined,
	searchFrom: number,
): Token {
	if (typeof raw === "string") {
		const start = findTokenStart(text, raw, searchFrom);
		return {
			text: raw,
			normalized: normalizeTokenText(raw),
			start,
			end: start === undefined ? undefined : start + [...raw].length,
			pos,
			source: "hanlp",
		};
	}

	if (isRecord(raw)) {
		const value = raw.text ?? raw.word ?? raw.token;
		const tokenText = typeof value === "string" ? value : "";
		const start =
			numberOrUndefined(raw.start) ??
			findTokenStart(text, tokenText, searchFrom);
		const end = numberOrUndefined(raw.end) ?? tokenEnd(start, tokenText);
		return {
			text: tokenText,
			normalized: normalizeTokenText(tokenText),
			start,
			end,
			pos:
				typeof raw.pos === "string"
					? raw.pos
					: typeof raw.tag === "string"
						? raw.tag
						: pos,
			source: "hanlp",
		};
	}

	return {
		text: String(raw),
		normalized: normalizeTokenText(String(raw)),
		pos,
		source: "hanlp",
	};
}

function findTokenStart(
	text: string,
	token: string,
	searchFrom: number,
): number | undefined {
	if (!token) return undefined;
	const searchStart = [...text].slice(0, searchFrom).join("").length;
	const position = text.indexOf(token, searchStart);
	if (position < 0) return undefined;
	return [...text.slice(0, position)].length;
}

function tokenEnd(
	start: number | undefined,
	token: string,
): number | undefined {
	return start === undefined ? undefined : start + [...token].length;
}

function normalizeTokenText(text: string): string {
	return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function pickNested(value: unknown, index: number): unknown {
	return Array.isArray(value) && Array.isArray(value[index])
		? value[index]
		: undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
