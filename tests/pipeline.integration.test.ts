/**
 * @module
 *
 * Integration test: analyze → generate pipeline with fixture data.
 * No network calls — uses hardcoded `VideoEntry[]`.
 */
import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSkill } from "../src/features/skill-generation/generate-skill.ts";
import { analyzeStyle } from "../src/features/style-analysis/analyze.ts";
import type {
	NlpBackend,
	NlpDocument,
} from "../src/features/style-analysis/types.ts";
import type { VideoEntry } from "../src/features/video-titles/types.ts";
import {
	readCSV,
	writeCSV,
	writeJsonFile,
	writeYamlFile,
} from "../src/shared/files.ts";

class MockNlpBackend implements NlpBackend {
	readonly name = "hanlp" as const;
	readonly tasks = ["tok", "pos", "ner"];

	async checkHealth(): Promise<void> {}

	async analyze(texts: string[]): Promise<NlpDocument[]> {
		return texts.map((text) => ({
			text,
			tokens: text
				.split(/(\s+|[，,；;、｜|：:！!？?])/)
				.filter(
					(token) => token.trim() && !/[，,；;、｜|：:！!？?]/.test(token),
				)
				.map((token) => ({
					text: token,
					normalized: token.toLowerCase(),
					source: "hanlp" as const,
				})),
			entities: [
				...(text.includes("OpenAI")
					? [{ text: "OpenAI", type: "organization", source: "hanlp" as const }]
					: []),
				...(text.includes("英伟达")
					? [{ text: "英伟达", type: "organization", source: "hanlp" as const }]
					: []),
			],
		}));
	}
}

test("analyzes fixture titles and renders a skill", async () => {
	const videos: VideoEntry[] = [
		{
			aid: 1,
			bvid: "BV1",
			title: "OpenAI突然炸裂发布新模型，谷歌微软全都坐不住了！| AI日报0702",
			created: 1700000000,
			createdDate: "2023-11-14",
		},
		{
			aid: 2,
			bvid: "BV2",
			title: "英伟达市值再创新高；国产大模型突然反击，AI行业要变天？",
			created: 1700000100,
			createdDate: "2023-11-14",
		},
	];

	const { analysis, features } = await analyzeStyle(videos, {
		uid: "3706929260006322",
		backend: new MockNlpBackend(),
		batchSize: 2,
		now: new Date("2026-07-03T00:00:00.000Z"),
	});
	const skill = generateSkill(analysis);

	expect(analysis.corpus.totalTitles).toBe(2);
	expect(analysis.generation.representativeTitles.length).toBeGreaterThan(0);
	expect(analysis.phrases.openingHooks.length).toBeGreaterThan(0);
	expect(analysis.entities.brandsAndProducts.length).toBeGreaterThan(0);
	expect(features[0]?.tokens.some((token) => token.text === "AI日报")).toBe(
		true,
	);
	expect(skill).toContain("核心特征");
	expect(skill).toContain("标题公式");
	expect(skill).toContain("荒诞意象");
	expect(skill).toContain("OpenAI突然炸裂");
});

test("writes analysis yaml and title features json", async () => {
	const dir = mkdtempSync(join(tmpdir(), "heya-"));
	const analysisPath = join(dir, "02-style-analysis.yaml");
	const featuresPath = join(dir, "03-title-features.json");
	const videos: VideoEntry[] = [
		{
			aid: 1,
			bvid: "BV1",
			title:
				"GPT-5.6 引爆 AI圈，奥特曼瘫坐在核弹上仿佛看到了椅子爆炸！| AI日报0703",
			created: 1700000000,
			createdDate: "2023-11-14",
		},
	];

	const { analysis, features } = await analyzeStyle(videos, {
		uid: "3706929260006322",
		backend: new MockNlpBackend(),
		batchSize: 1,
		now: new Date("2026-07-03T00:00:00.000Z"),
	});

	writeYamlFile(analysisPath, analysis);
	writeJsonFile(featuresPath, features);

	expect(features[0]?.tokens.map((token) => token.text)).toContain("GPT-5.6");
	expect(features[0]?.tokens.map((token) => token.text)).toContain("椅子爆炸");
	expect(generateSkill(analysis)).toContain("推荐公式");
});

test("counts dictionary brand entities once per matching title", async () => {
	const videos: VideoEntry[] = [
		{
			aid: 1,
			bvid: "BV1",
			title: "OpenAI 发布新模型",
			created: 1700000000,
			createdDate: "2023-11-14",
		},
	];

	const { analysis } = await analyzeStyle(videos, {
		uid: "3706929260006322",
		backend: new MockNlpBackend(),
		batchSize: 1,
		now: new Date("2026-07-03T00:00:00.000Z"),
	});

	expect(analysis.entities.brandsAndProducts).toContainEqual(["OpenAI", 1]);
});

test("CSV cache round-trips quoted newlines", () => {
	const dir = mkdtempSync(join(tmpdir(), "heya-csv-"));
	const path = join(dir, "titles.csv");

	writeCSV(path, [
		{
			aid: 1,
			bvid: "BV1",
			title: '第一行\n第二行，带逗号和"引号"',
			created: 1700000000,
			createdDate: "2023-11-14",
		},
	]);

	expect(readCSV(path)).toEqual([
		{
			aid: "1",
			bvid: "BV1",
			title: '第一行\n第二行，带逗号和"引号"',
			created: "1700000000",
			createdDate: "2023-11-14",
		},
	]);
});
