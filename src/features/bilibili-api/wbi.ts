import { createHash } from "node:crypto";

/**
 * Bilibili Wbi signing permutation table.
 *
 * Concatenate `imgKey + subKey`, then pick characters at these indices to form
 * a 64‑char string. The first 32 chars become the "mixin key" used for signing.
 * Table is a fixed shuffle of 0..63 — identical across all Bilibili clients.
 */
const mixinKeyEncTab = [
	46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
	33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
	26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
	20, 34, 44, 52,
] as const;

export interface WbiKeys {
	imgKey: string;
	subKey: string;
}

/**
 * Extract the filename stem from a Wbi image URL.
 *
 * @param url - Full Wbi image URL (e.g. `https://i0.hdslb.com/bfs/wbi/abc123.png`).
 * @returns The filename without extension (e.g. `"abc123"`).
 * @throws If URL lacks a valid slash‑dot segment.
 */
export function extractWbiKey(url: string): string {
	const lastSlash = url.lastIndexOf("/");
	const lastDot = url.lastIndexOf(".");
	if (lastSlash === -1 || lastDot === -1 || lastDot <= lastSlash) {
		throw new Error(`Invalid Wbi image URL: ${url}`);
	}

	return url.slice(lastSlash + 1, lastDot);
}

/**
 * Apply the Wbi permutation table to produce the mixin key.
 *
 * @param rawKey - Concatenated `imgKey + subKey`.
 * @returns First 32 characters after permutation.
 */
export function getMixinKey(rawKey: string): string {
	return mixinKeyEncTab
		.map((index) => rawKey[index] ?? "")
		.join("")
		.slice(0, 32);
}

/**
 * Sign API params with Wbi signature.
 *
 * - Sorts keys alphabetically, URL‑encodes, appends `wts` and `w_rid`.
 * - Strips `!'()*` from values (not URL‑safe in Bilibili's convention).
 * - `w_rid = MD5(query + mixinKey)` where mixinKey is derived from {@link WbiKeys}.
 *
 * @param params - Query parameters (`undefined` values are skipped).
 * @param keys - Wbi image keys from `getWbiKeys()`.
 * @param timestamp - Unix timestamp in seconds (defaults to now).
 * @returns Signed `URLSearchParams` ready to set on a URL.
 */
export function signWbiParams(
	params: Record<string, string | number | boolean | undefined>,
	keys: WbiKeys,
	timestamp = Math.round(Date.now() / 1000),
): URLSearchParams {
	const mixinKey = getMixinKey(keys.imgKey + keys.subKey);
	const sanitized: Record<string, string> = {};

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined) continue;
		sanitized[key] = String(value).replace(/[!'()*]/g, "");
	}
	sanitized.wts = String(timestamp);

	const query = Object.keys(sanitized)
		.sort()
		.map(
			(key) =>
				`${encodeURIComponent(key)}=${encodeURIComponent(sanitized[key] ?? "")}`,
		)
		.join("&");

	const wRid = createHash("md5")
		.update(query + mixinKey)
		.digest("hex");
	const signed = new URLSearchParams(query);
	signed.set("w_rid", wRid);

	return signed;
}
