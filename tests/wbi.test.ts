/**
 * @module
 *
 * Unit tests for Bilibili Wbi signing — key extraction, mixin generation,
 * and parameter signing with special‑character filtering.
 */
import { expect, test } from "bun:test";
import {
	extractWbiKey,
	getMixinKey,
	signWbiParams,
} from "../src/features/bilibili-api/wbi.ts";

test("extracts Wbi image keys", () => {
	expect(extractWbiKey("https://i0.hdslb.com/bfs/wbi/abc123.png")).toBe(
		"abc123",
	);
});

test("builds mixin keys using the documented permutation", () => {
	const key = getMixinKey(
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/",
	);
	expect(key).toHaveLength(32);
	expect(key).toBe("UVsc1ixGpYkF6dTJBRfXHjQtDCoNmMPn");
});

test("signs params with sorted keys and filters special characters", () => {
	const signed = signWbiParams(
		{ b: "two!", a: "one()", skip: undefined },
		{
			imgKey:
				"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/",
			subKey: "",
		},
		1700000000,
	);
	expect(signed.get("a")).toBe("one");
	expect(signed.get("b")).toBe("two");
	expect(signed.get("wts")).toBe("1700000000");
	expect(signed.get("w_rid")).toHaveLength(32);
});
