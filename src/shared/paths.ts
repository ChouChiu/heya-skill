import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Repository root: 3 levels up from this file (src/shared/ → src/ → root/)
export const rootDir = dirname(
	dirname(dirname(fileURLToPath(import.meta.url))),
);
export const skillDir = join(rootDir, "skills", "heya-title-style");
export const researchDir = join(skillDir, "references");
export const titlesPath = join(researchDir, "01-titles.csv");
export const analysisDataPath = join(researchDir, "02-style-analysis.yaml");
export const analysisReportPath = join(researchDir, "02-style-analysis.md");
export const skillTemplatePath = join(rootDir, "SKILL.template.md");
export const skillPath = join(skillDir, "SKILL.md");
