import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parse, stringify } from "yaml";

export function readJsonFile<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function writeJsonFile(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export function writeTextFile(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value.endsWith("\n") ? value : `${value}\n`, "utf-8");
}

// ---- YAML ----

export function readYamlFile<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }
  return parse(readFileSync(path, "utf-8")) as T;
}

export function writeYamlFile(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringify(value, { lineWidth: 0 }), "utf-8");
}

// ---- CSV ----

function escapeCSV(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function readCSV(path: string): Record<string, string>[] {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  const text = readFileSync(path, "utf-8").trim();
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  const headers = (lines[0] ?? "").split(",");
  const rows: Record<string, string>[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCSVLine(line);
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h !== undefined) row[h] = cells[i] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

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

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line.charAt(i);
    if (inQuotes) {
      if (char === '"') {
        if (line.charAt(i + 1) === '"') {
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
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  cells.push(current);
  return cells;
}
