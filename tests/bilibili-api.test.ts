import { expect, test } from "bun:test";
import { BilibiliClient } from "../src/features/bilibili-api/client.ts";
import {
  BilibiliApiError,
  isRiskControlHtml,
} from "../src/features/bilibili-api/errors.ts";

test("detects Bilibili risk-control HTML", () => {
  expect(isRiskControlHtml("<html><body>错误号: 412</body></html>")).toBe(true);
});

test("typed client rejects risk-control responses", async () => {
  const client = new BilibiliClient({
    cookie: "cookie",
    fetchImpl: async () =>
      new Response("<html><body>错误号: 412</body></html>", {
        status: 200,
      }),
  });

  await expect(client.getUpStat("1")).rejects.toBeInstanceOf(BilibiliApiError);
});
