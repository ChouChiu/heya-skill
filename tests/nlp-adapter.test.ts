import { expect, test } from "bun:test";
import {
	applyDomainProtection,
	buildTitleFeature,
} from "../src/features/style-analysis/analyze.ts";
import {
	HanlpBackend,
	normalizeHanlpResponse,
} from "../src/features/style-analysis/nlp.ts";
import type { Token } from "../src/features/style-analysis/types.ts";
import type { VideoEntry } from "../src/features/video-titles/types.ts";

test("normalizes batched HanLP tok pos ner payloads", () => {
	const docs = normalizeHanlpResponse(
		{
			"tok/fine": [
				["OpenAI", "发布"],
				["Gemini", "3.5", "Pro"],
			],
			"pos/ctb": [
				["nx", "v"],
				["nx", "m", "nx"],
			],
			"ner/msra": [
				[["OpenAI", "organization", 0, 1, 0.99]],
				[["Gemini 3.5 Pro", "model", 0, 3]],
			],
		},
		["OpenAI发布", "Gemini 3.5 Pro"],
	);

	expect(docs).toHaveLength(2);
	expect(docs[0]?.tokens[0]).toMatchObject({
		text: "OpenAI",
		pos: "nx",
		source: "hanlp",
	});
	expect(docs[1]?.entities[0]).toMatchObject({
		text: "Gemini 3.5 Pro",
		type: "model",
	});
});

test("normalizes repeated token offsets with a forward cursor", () => {
	const docs = normalizeHanlpResponse(
		{
			tok: [["AI", "AI"]],
			pos: [["nx", "nx"]],
			ner: [[]],
		},
		["AI AI"],
	);

	expect(docs[0]?.tokens).toMatchObject([
		{ text: "AI", start: 0, end: 2 },
		{ text: "AI", start: 3, end: 5 },
	]);
});

test("HanLP backend posts parse requests and checks health", async () => {
	const requests: string[] = [];
	const backend = new HanlpBackend({
		url: "http://hanlp.local",
		timeoutMs: 1000,
		fetchImpl: async (input, init) => {
			const url = new URL(String(input));
			requests.push(url.pathname);
			if (url.pathname === "/health") return Response.json({ ok: true });
			const body = JSON.parse(String(init?.body)) as { text: string[] };
			return Response.json({
				tok: body.text.map((text) => text.split(/\s+/)),
				pos: body.text.map((text) => text.split(/\s+/).map(() => "n")),
				ner: body.text.map(() => []),
			});
		},
	});

	await backend.checkHealth();
	const docs = await backend.analyze(["OpenAI 发布"]);
	expect(requests).toEqual(["/health", "/parse"]);
	expect(docs[0]?.tokens.map((token) => token.text)).toEqual([
		"OpenAI",
		"发布",
	]);
});

test("HanLP backend reports timeouts clearly", async () => {
	const backend = new HanlpBackend({
		url: "http://hanlp.local",
		timeoutMs: 1,
		fetchImpl: async (_input, init) => {
			return await new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					reject(new DOMException("aborted", "AbortError"));
				});
			});
		},
	});

	await expect(backend.checkHealth()).rejects.toThrow("timed out");
});

test("HanLP backend explains connection failures", async () => {
	const backend = new HanlpBackend({
		url: "http://127.0.0.1:8765",
		timeoutMs: 1000,
		fetchImpl: async () => {
			throw new Error(
				"Unable to connect. Is the computer able to access the url?",
			);
		},
	});

	await expect(backend.checkHealth()).rejects.toThrow(
		"bun pipeline --skip-fetch --skip-analyze",
	);
});

test("domain protection keeps model names and Heya imagery intact", () => {
	const title =
		"GPT-5.6 与 DeepSeek-V4.1 引爆 AI圈，Token Plan 斩杀线来了，仿佛看到了椅子爆炸！| AI日报0703";
	const tokens: Token[] = [...title].map((char, index) => ({
		text: char,
		normalized: char.toLowerCase(),
		start: index,
		end: index + 1,
		source: "hanlp",
	}));

	const protectedTokens = applyDomainProtection(title, tokens).map(
		(token) => token.text,
	);
	expect(protectedTokens).toContain("GPT-5.6");
	expect(protectedTokens).toContain("DeepSeek-V4.1");
	expect(protectedTokens).toContain("AI圈");
	expect(protectedTokens).toContain("Token Plan");
	expect(protectedTokens).toContain("斩杀线来了");
	expect(protectedTokens).toContain("椅子爆炸");
	expect(protectedTokens).toContain("AI日报");
});

test("title features include protected tokens as model entities", () => {
	const video: VideoEntry = {
		aid: 1,
		bvid: "BV1",
		title: "Gemini 3.5 Pro 引爆 AI圈！| AI日报0703",
		created: 1700000000,
		createdDate: "2023-11-14",
	};

	const feature = buildTitleFeature(video, {
		text: video.title,
		tokens: [],
		entities: [],
	});

	expect(feature.tokens.map((token) => token.text)).toContain("Gemini 3.5 Pro");
	expect(feature.entities.map((entity) => entity.text)).toContain(
		"Gemini 3.5 Pro",
	);
});
