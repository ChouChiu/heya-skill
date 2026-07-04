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

const AUTO_SECTIONS = {
	coreFeatures: "core-features",
	titleExamples: "title-examples",
	vocabLibrary: "vocab-library",
	structureFormulas: "structure-formulas",
} as const;

/**
 * Fill all 4 auto‑replace sections in the skill template.
 *
 * @param analysis - Style analysis result.
 * @returns Final `SKILL.md` content.
 */
export function generateSkill(analysis: StyleAnalysis): string {
	let skill = loadSkillTemplate();
	skill = replaceSection(
		skill,
		AUTO_SECTIONS.coreFeatures,
		renderCoreFeatures(analysis),
	);
	skill = replaceSection(
		skill,
		AUTO_SECTIONS.titleExamples,
		renderTitleExamples(analysis),
	);
	skill = replaceSection(
		skill,
		AUTO_SECTIONS.vocabLibrary,
		renderVocabLibrary(analysis),
	);
	skill = replaceSection(
		skill,
		AUTO_SECTIONS.structureFormulas,
		renderStructureFormulas(analysis),
	);
	return skill;
}
