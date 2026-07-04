/**
 * @module
 *
 * Template I/O for SKILL.md generation.
 *
 * Templates use `<!-- AUTO_START:name -->` / `<!-- AUTO_END:name -->`
 * markers. Content between markers is replaced; rest is preserved.
 */
import { existsSync, readFileSync } from "node:fs";
import { skillTemplatePath } from "../../shared/paths.ts";

/**
 * Read the raw template from disk.
 *
 * @returns Template content as a string.
 * @throws If template file does not exist.
 */
export function loadSkillTemplate(): string {
	if (!existsSync(skillTemplatePath)) {
		throw new Error(`Missing skill template: ${skillTemplatePath}`);
	}

	return readFileSync(skillTemplatePath, "utf-8");
}

/**
 * Replace content between a pair of `AUTO_START/END` markers.
 *
 * @param content - Full template string.
 * @param sectionName - Section identifier (e.g. `"core-features"`).
 * @param newContent - Replacement content (will be trimmed).
 * @returns Template with replaced section.
 * @throws If markers are missing or out of order.
 */
export function replaceSection(
	content: string,
	sectionName: string,
	newContent: string,
): string {
	const startMarker = `<!-- AUTO_START:${sectionName} -->`;
	const endMarker = `<!-- AUTO_END:${sectionName} -->`;
	const start = content.indexOf(startMarker);
	const end = content.indexOf(endMarker);

	if (start === -1 || end === -1 || end < start) {
		throw new Error(`Missing skill section markers: ${sectionName}`);
	}

	return `${content.slice(0, start + startMarker.length)}\n${newContent.trim()}\n${content.slice(end)}`;
}
