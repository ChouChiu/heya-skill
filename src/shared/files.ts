/**
 * @module
 *
 * Thin I/O wrappers for JSON, YAML, and CSV files.
 *
 * All write helpers auto-create parent directories.
 * CSV parser handles {@link https://datatracker.ietf.org/doc/html/rfc4180 | RFC 4180} quoting.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse, stringify } from "yaml";

/**
 * @param path - Absolute or relative file path.
 * @returns Parsed JSON as `T`.
 * @throws If file is missing or contains invalid JSON.
 */
export function readJsonFile<T>(path: string): T {
	if (!existsSync(path)) {
		throw new Error(`Missing file: ${path}`);
	}

	return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/**
 * @param path - Target file path. Parent directories created if needed.
 * @param value - Value to serialize (2-space indented).
 */
export function writeJsonFile(path: string, value: unknown): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

/**
 * @param path - Target file path. Parent directories created if needed.
 * @param value - String content. Guaranteed to end with `\n`.
 */
export function writeTextFile(path: string, value: string): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, value.endsWith("\n") ? value : `${value}\n`, "utf-8");
}

/**
 * @param path - Target file path. Parent directories created if needed.
 * @param content - String content to write.
 * @returns `true` if file was written, `false` if skipped (content identical).
 */
export function writeFileIfChanged(path: string, content: string): boolean {
	mkdirSync(dirname(path), { recursive: true });
	if (existsSync(path) && readFileSync(path, "utf-8") === content) return false;
	writeFileSync(path, content, "utf-8");
	return true;
}

// ---- YAML ----

/**
 * Read and parse a YAML file via the `yaml` package.
 *
 * @param path - Absolute or relative file path.
 * @returns Plain JS objects (no YAML schema types).
 * @throws If file is missing.
 * @typeParam T - Expected shape of the parsed document.
 */
export function readYamlFile<T>(path: string): T {
	if (!existsSync(path)) {
		throw new Error(`Missing file: ${path}`);
	}
	return parse(readFileSync(path, "utf-8")) as T;
}

/**
 * @param path - Target file path. Parent directories created if needed.
 * @param value - Value to serialize (lineWidth=0, no forced wrapping).
 */
export function writeYamlFile(path: string, value: unknown): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, stringify(value, { lineWidth: 0 }), "utf-8");
}

// ---- CSV ----

/**
 * RFC 4180 cell quoting — wraps in double-quotes if value contains commas,
 * double-quotes, or newlines.
 *
 * @param value - Cell value.
 * @returns Ready-to-write CSV cell.
 */
function escapeCSV(value: string | number): string {
	const s = String(value);
	if (s.includes(",") || s.includes('"') || s.includes("\n")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

/**
 * @param path - CSV file path.
 * @returns Array of row objects keyed by header names.
 * @throws If file is missing.
 */
export function readCSV(path: string): Record<string, string>[] {
	if (!existsSync(path)) {
		throw new Error(`Missing file: ${path}`);
	}

	const records = parseCSVRecords(readFileSync(path, "utf-8"));
	if (records.length < 2) return [];

	const headers = records[0] ?? [];
	const rows: Record<string, string>[] = [];

	for (const cells of records.slice(1)) {
		if (cells.every((cell) => !cell.trim())) continue;
		const row: Record<string, string> = {};
		for (let i = 0; i < headers.length; i++) {
			const h = headers[i];
			if (h !== undefined) row[h] = cells[i] ?? "";
		}
		rows.push(row);
	}

	return rows;
}

/**
 * @param path - Target file path.
 * @param rows - Row objects. Headers derived from first row keys.
 */
export function writeCSV(
	path: string,
	rows: Record<string, string | number>[],
): void {
	if (rows.length === 0) {
		writeTextFile(path, "");
		return;
	}

	const headers = Object.keys(rows[0] ?? {});
	const lines = [headers.join(",")];

	for (const row of rows) {
		lines.push(headers.map((h) => escapeCSV(row[h] ?? "")).join(","));
	}

	writeTextFile(path, lines.join("\n"));
}

/**
 * RFC 4180 CSV parser with quoted-field, escaped-quote, and quoted-newline support.
 *
 * @param text - Full CSV document.
 * @returns CSV records as rows of field values.
 */
function parseCSVRecords(text: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const char = text.charAt(i);
		if (inQuotes) {
			if (char === '"') {
				if (text.charAt(i + 1) === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += char;
			}
		} else {
			if (char === '"') {
				inQuotes = true;
			} else if (char === ",") {
				record.push(current);
				current = "";
			} else if (char === "\n" || char === "\r") {
				record.push(current);
				records.push(record);
				record = [];
				current = "";
				if (char === "\r" && text.charAt(i + 1) === "\n") i++;
			} else {
				current += char;
			}
		}
	}

	if (current.length > 0 || record.length > 0) {
		record.push(current);
		records.push(record);
	}

	return records;
}
