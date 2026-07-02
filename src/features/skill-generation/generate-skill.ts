import type { StyleAnalysis } from "../style-analysis/types.ts";
import {
  renderCoreFeatures,
  renderStructureFormulas,
  renderTitleExamples,
  renderVocabLibrary,
  renderWritingRules,
} from "./renderers.ts";
import { loadSkillTemplate, replaceSection } from "./template.ts";

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
  skill = replaceSection(skill, "writing-rules", renderWritingRules());
  return skill;
}
