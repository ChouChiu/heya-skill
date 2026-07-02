/**
 * @module
 *
 * Integration test: analyze → generate pipeline with fixture data.
 * No network calls — uses hardcoded `VideoEntry[]`.
 */
import { expect, test } from "bun:test";
import { generateSkill } from "../src/features/skill-generation/generate-skill.ts";
import { analyzeStyle } from "../src/features/style-analysis/analyze.ts";
import type { VideoEntry } from "../src/features/video-titles/types.ts";

test("analyzes fixture titles and renders a skill", () => {
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

  const analysis = analyzeStyle(videos, "3706929260006322");
  const skill = generateSkill(analysis);

  expect(analysis.meta.totalVideos).toBe(2);
  expect(analysis.emotion.topTitles.length).toBeGreaterThan(0);
  expect(analysis.structure.openingHooks.length).toBeGreaterThan(0);
  expect(analysis.entities.brandsAndProducts.length).toBeGreaterThan(0);
  expect(skill).toContain("核心特征");
  expect(skill).toContain("标题公式");
  expect(skill).toContain("OpenAI突然炸裂");
});
