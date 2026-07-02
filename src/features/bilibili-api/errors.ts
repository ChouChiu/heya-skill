export class BilibiliApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BilibiliApiError";
  }
}

export function isRiskControlHtml(body: string): boolean {
  return (
    body.includes("错误号: 412") ||
    body.includes("security control policy") ||
    body.includes("<html")
  );
}
