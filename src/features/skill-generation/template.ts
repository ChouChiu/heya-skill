import { existsSync, readFileSync } from "node:fs";
import { skillTemplatePath } from "../../shared/paths.ts";

export function loadSkillTemplate(): string {
  if (!existsSync(skillTemplatePath)) {
    throw new Error(`Missing skill template: ${skillTemplatePath}`);
  }

  return readFileSync(skillTemplatePath, "utf-8");
}

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
