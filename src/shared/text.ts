export function joinWords(words: [word: string, count: number][]): string {
	return words.length > 0 ? words.map(([word]) => word).join("、") : "暂无";
}

export function normalizeTokenText(text: string): string {
	return text.trim().replace(/\s+/g, " ").toLowerCase();
}
