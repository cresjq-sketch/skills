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

  test("prioritizes academic keywords over incidental planning words", () => {
    const summary = deriveSkillSummary(skillWith("academic-paper", "write paper plan outline citation review"));

    expect(summary.category).toBe("学术写作");
  });

  test("maps browser keywords to Chinese computer control category", () => {
    const summary = deriveSkillSummary(skillWith("browser", "open websites and click"));

    expect(summary.category).toBe("浏览器/电脑控制");
    expect(summary.triggerHints).toContain("打开网页、点击、填写或检查页面时");
  });

  test("does not treat inspect as a planning spec keyword", () => {
    const summary = deriveSkillSummary(skillWith("control-in-app-browser", "Control the in-app Browser. Use to inspect, test, click, type, screenshot, or verify local targets."));

    expect(summary.category).toBe("浏览器/电脑控制");
  });

  test("classifies computer-use from its own description instead of policy body", () => {
    const markdown = `---
name: computer-use
description: Control local Mac apps through Computer Use. Use for tasks that require reading or operating app UI by clicking, typing, scrolling, dragging, pressing keys, or setting values.
---
# Computer Use

Because Computer Use and Browser Use MCPs can trigger external side effects through live UI actions, follow the below policy.

## Internet permissions
`;

    const summary = deriveSkillSummary(skillWith("computer-use", markdown));

    expect(summary.category).toBe("浏览器/电脑控制");
    expect(summary.summary).toBe("用于通过 Computer Use 操作本机 Mac 应用，适合点击、输入、滚动、拖拽、按键和设置界面值等任务。");
    expect(summary.summary).not.toContain("互联网");
    expect(summary.summary).not.toContain("搜索");
  });

  test("does not classify plugin skills as code collaboration because of the .codex path", () => {
    const skill = {
      ...skillWith("computer-use", "Control local Mac apps through Computer Use."),
      skillDir: "/Users/demo/.codex/plugins/cache/openai-bundled/computer-use/skills/computer-use"
    };

    const summary = deriveSkillSummary(skill);

    expect(summary.category).toBe("浏览器/电脑控制");
  });

  test("summarizes document skills from the skill description", () => {
    const markdown = `---
name: documents
description: Create, edit, redline, and comment on .docx, Word, and Google Docs-targeted document artifacts inside the container, with a strict render-and-verify workflow.
---
# Documents Skill
`;

    const summary = deriveSkillSummary(skillWith("documents", markdown));

    expect(summary.category).toBe("文档办公");
    expect(summary.summary).toContain("Word/DOCX");
    expect(summary.summary).toContain("渲染预览");
  });

  test("classifies brainstorming as planning instead of image design", () => {
    const markdown = `---
name: brainstorming
description: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
---
# Brainstorming Ideas Into Designs
`;

    const summary = deriveSkillSummary(skillWith("brainstorming", markdown));

    expect(summary.category).toBe("需求规划");
    expect(summary.summary).toBe("用于在创建功能、组件或修改行为之前澄清用户意图、需求和设计方案。");
    expect(summary.triggerHints).toEqual(["开始做功能、组件、创意方案或行为修改之前"]);
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
    expect(summary).not.toHaveProperty("boundaries");
  });

  test("reads folded yaml descriptions when generating summaries", () => {
    const markdown = `---
name: agent-reach
description: >
  MUST USE when user wants to 调研/research/搜索/search/查/找/look up anything
  on the internet.

  Also MUST USE when user mentions 小红书, Reddit, YouTube, GitHub code search,
  RSS feeds, or any web URL.
---
# Agent Reach
`;

    const summary = deriveSkillSummary(skillWith("agent-reach", markdown));

    expect(summary.category).toBe("搜索调研");
    expect(summary.summary).toContain("互联网");
    expect(summary.summary).toContain("小红书");
    expect(summary.summary).not.toBe("适合代码仓库、GitHub、分支、提交、PR 和代码协作相关任务。");
  });

  test("keeps category fallback for sparse skills", () => {
    const summary = deriveSkillSummary(skillWith("github-helper", "github repo commit"));

    expect(summary.category).toBe("代码协作");
  });
});
