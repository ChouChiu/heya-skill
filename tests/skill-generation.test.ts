import { expect, test } from "bun:test";
import {
  loadSkillTemplate,
  replaceSection,
} from "../src/features/skill-generation/template.ts";

test("loads the external skill template", () => {
  const template = loadSkillTemplate();
  expect(template).toContain("引用资料");
  expect(template).toContain("<!-- AUTO_START:core-features -->");
});

test("replaces marked skill sections", () => {
  const output = replaceSection(
    "a\n<!-- AUTO_START:x -->\nold\n<!-- AUTO_END:x -->\nb",
    "x",
    "new",
  );
  expect(output).toContain("<!-- AUTO_START:x -->\nnew\n<!-- AUTO_END:x -->");
});

test("throws when section markers are missing", () => {
  expect(() => replaceSection("missing", "x", "new")).toThrow();
});
