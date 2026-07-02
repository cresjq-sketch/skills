import { describe, expect, test } from "vitest";
import { deriveSkillSummary } from "../skillSummary";
import type { SkillRecord, SkillOverride } from "../../shared/types";

function skillWith(name: string, text: string): SkillRecord {
  return {
    id: `${name}-id`,
    name,
    description: text,
    sourceType: "codex",
    sourceRoot: "/tmp/skills",
    skillDir: `/tmp/skills/${name}`,
    skillFile: `/tmp/skills/${name}/SKILL.md`,
    markdown: text,
    metadata: { name, description: text }
  };
}

describe("deriveSkillSummary", () => {
  test("maps academic keywords to Chinese academic writing category", () => {
    const summary = deriveSkillSummary(skillWith("academic-paper", "write paper citation review"));

    expect(summary.category).toBe("学术写作");
    expect(summary.summary).toContain("论文");
  });

  test("maps browser keywords to Chinese computer control category", () => {
    const summary = deriveSkillSummary(skillWith("browser", "open websites and click"));

    expect(summary.category).toBe("浏览器/电脑控制");
    expect(summary.triggerHints).toContain("打开网页、点击、填写或检查页面时");
  });

  test("falls back for unknown skills", () => {
    const summary = deriveSkillSummary(skillWith("unknown", ""));

    expect(summary.category).toBe("通用技能");
    expect(summary.summary).toBe("查看原文了解这个技能的具体用途。");
  });

  test("uses manual Chinese overrides before generated values", () => {
    const override: SkillOverride = {
      displayName: "论文助手",
      category: "我的分类",
      summary: "帮我写论文"
    };

    expect(deriveSkillSummary(skillWith("academic-paper", "write paper citation review"), override)).toMatchObject({
      displayName: "论文助手",
      category: "我的分类",
      summary: "帮我写论文"
    });
  });
});
