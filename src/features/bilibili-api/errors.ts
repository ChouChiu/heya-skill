/**
 * Custom error for Bilibili API failures.
 *
 * @param message - Human‑readable error description.
 * @param status - Optional HTTP status code (e.g. 412).
 */
export class BilibiliApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BilibiliApiError";
  }
}

/**
 * Detect Bilibili risk‑control HTML responses — error 412 / security policy / bare `<html>`.
 *
 * @param body - Raw response body text.
 * @returns `true` if response looks like a risk‑control page.
 */
export function isRiskControlHtml(body: string): boolean {
  return (
    body.includes("错误号: 412") ||
    body.includes("security control policy") ||
    body.includes("<html")
  );
}
