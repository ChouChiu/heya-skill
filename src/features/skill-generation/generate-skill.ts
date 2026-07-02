/**
 * @module
 *
 * SKILL.md generation.
 *
 * Loads `SKILL.template.md`, replaces 4 `<!-- AUTO_START/END -->` sections
 * with rendered content from the style analysis, and returns the final Markdown.
 */
import type { StyleAnalysis } from "../style-analysis/types.ts";
import {
	renderCoreFeatures,
	renderStructureFormulas,
	renderTitleExamples,
	renderVocabLibrary,
} from "./renderers.ts";
import { loadSkillTemplate, replaceSection } from "./template.ts";

/**
 * Fill all 4 auto‑replace sections in the skill template.
 *
 * @param analysis - Style analysis result.
 * @returns Final `SKILL.md` content.
 */
export function generateSkill(analysis: StyleAnalysis): string {
	let skill = loadSkillTemplate();
	skill = replaceSection(skill, "core-features", renderCoreFeatures(analysis));
	skill = replaceSection(
		skill,
		"title-examples",
		renderTitleExamples(analysis),
	);
	skill = replaceSection(skill, "vocab-library", renderVocabLibrary(analysis));
	skill = replaceSection(
		skill,
		"structure-formulas",
		renderStructureFormulas(analysis),
	);
	return skill;
}
