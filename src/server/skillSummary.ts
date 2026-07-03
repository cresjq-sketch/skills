import type { SkillOverride, SkillRecord, SkillSummary } from "../shared/types";

interface CategoryRule {
  category: string;
  keywords: string[];
  summary: string;
  triggerHints: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "学术写作",
    keywords: ["paper", "academic", "citation", "review", "rebuttal", "论文", "文献"],
    summary: "适合论文写作、文献综述、引用检查、审稿意见分析和学术润色。",
    triggerHints: ["写论文、查文献、处理引用或审稿意见时"]
  },
  {
    category: "文档办公",
    keywords: ["docx", "document", "pdf", "spreadsheet", "presentation", "excel", "word", "slides"],
    summary: "适合处理文档、PDF、表格、演示文稿等办公文件。",
    triggerHints: ["需要创建、修改、检查文档或表格时"]
  },
  {
    category: "代码协作",
    keywords: ["git", "github", "code", "repo", "repository", "pull request", "commit"],
    summary: "适合代码仓库、GitHub、分支、提交、PR 和代码协作相关任务。",
    triggerHints: ["需要查看仓库、提交代码、处理 PR 或 GitHub 内容时"]
  },
  {
    category: "图像设计",
    keywords: ["image", "design", "canva", "photo", "poster", "图像", "设计"],
    summary: "适合生成图片、处理设计稿、制作视觉素材或 Canva 内容。",
    triggerHints: ["需要图片、海报、设计稿或视觉素材时"]
  },
  {
    category: "自动化",
    keywords: ["automation", "reminder", "monitor", "schedule", "自动化", "提醒"],
    summary: "适合创建提醒、监控、定时任务和重复工作流。",
    triggerHints: ["需要定时提醒、持续监控或自动执行任务时"]
  },
  {
    category: "搜索调研",
    keywords: ["research", "search", "crawl", "scrape", "调研", "搜索"],
    summary: "适合收集资料、搜索网页、整理外部信息和做主题调研。",
    triggerHints: ["需要查资料、看网页、整理外部信息时"]
  },
  {
    category: "浏览器/电脑控制",
    keywords: ["chrome", "browser", "computer", "click", "website", "websites", "网页", "浏览器"],
    summary: "适合打开网页、点击页面、填写表单、检查网页状态或操作本机应用。",
    triggerHints: ["打开网页、点击、填写或检查页面时"]
  },
  {
    category: "技能/插件管理",
    keywords: ["skill", "plugin", "template", "技能", "插件", "模板"],
    summary: "适合创建、安装、管理 Codex 技能、插件或模板。",
    triggerHints: ["需要管理技能、插件、模板或扩展能力时"]
  }
];

export function deriveSkillSummary(skill: SkillRecord, override: SkillOverride = {}): SkillSummary {
  const text = [
    skill.name,
    skill.description,
    meaningfulPathText(skill.skillDir),
    Object.values(skill.metadata).join(" "),
    skill.markdown
  ]
    .join(" ")
    .toLowerCase();

  const rule = CATEGORY_RULES.find((candidate) =>
    candidate.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );

  return {
    displayName: override.displayName || skill.name,
    category: override.category || rule?.category || "通用技能",
    summary: override.summary || rule?.summary || "查看原文了解这个技能的具体用途。",
    triggerHints: rule?.triggerHints ?? ["不确定时可打开原文查看触发条件和使用边界"]
  };
}

function meaningfulPathText(value: string) {
  return value
    .split(/[\\/]/)
    .filter((part) => part && !["skills", "skill", "cache", "plugins", "plugin", "tmp"].includes(part.toLowerCase()))
    .join(" ");
}
