import { createHash } from "node:crypto";

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

export function extractWbiKey(url: string): string {
  const lastSlash = url.lastIndexOf("/");
  const lastDot = url.lastIndexOf(".");
  if (lastSlash === -1 || lastDot === -1 || lastDot <= lastSlash) {
    throw new Error(`Invalid Wbi image URL: ${url}`);
  }

  return url.slice(lastSlash + 1, lastDot);
}

export function getMixinKey(rawKey: string): string {
  return mixinKeyEncTab
    .map((index) => rawKey[index] ?? "")
    .join("")
    .slice(0, 32);
}

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
