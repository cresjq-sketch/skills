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

  test("prioritizes academic keywords over incidental browser keywords", () => {
    const summary = deriveSkillSummary(skillWith("academic-paper", "write paper citation review browser"));

    expect(summary.category).toBe("学术写作");
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

  test("derives an agent-reach style summary from source markdown instead of category template", () => {
    const markdown = `---
name: agent-reach
description: MUST USE when user wants to 调研/research/搜索/search/查/找/look up anything on the internet, GitHub code search, YouTube, Reddit, 小红书.
---
# Agent Reach

15 平台、多后端。

NOT for: 写报告/数据分析/翻译等内容加工；
发帖/评论/点赞等写操作。
`;

    const summary = deriveSkillSummary(skillWith("agent-reach", markdown));

    expect(summary.summary).toContain("互联网");
    expect(summary.summary).toContain("多平台");
    expect(summary.category).toBe("搜索调研");
    expect(summary.triggerHints.join(" ")).toContain("搜索");
    expect(summary.triggerHints.join(" ")).toContain("调研");
    expect(summary.boundaries.join(" ")).toContain("发帖");
    expect(summary.boundaries.join(" ")).toContain("评论");
    expect(summary.boundaries.join(" ")).toContain("点赞");
  });

  test("keeps category fallback for sparse skills while adding empty boundaries", () => {
    const summary = deriveSkillSummary(skillWith("github-helper", "github repo commit"));

    expect(summary.category).toBe("代码协作");
    expect(summary.boundaries).toEqual([]);
  });
});
