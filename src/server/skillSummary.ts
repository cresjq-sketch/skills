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
  const sourceSignals = extractSourceSignals(skill);

  return {
    displayName: override.displayName || skill.name,
    category: override.category || rule?.category || "通用技能",
    summary: override.summary || sourceSignals.summary || rule?.summary || "查看原文了解这个技能的具体用途。",
    triggerHints: sourceSignals.triggerHints.length
      ? sourceSignals.triggerHints
      : rule?.triggerHints ?? ["不确定时可打开原文查看触发条件和使用边界"],
    boundaries: sourceSignals.boundaries
  };
}

function meaningfulPathText(value: string) {
  return value
    .split(/[\\/]/)
    .filter((part) => part && !["skills", "skill", "cache", "plugins", "plugin", "tmp"].includes(part.toLowerCase()))
    .join(" ");
}

function extractSourceSignals(skill: SkillRecord) {
  const markdown = skill.markdown;
  const lower = markdown.toLowerCase();
  const description = skill.description || skill.metadata.description || "";
  const triggerLine = findLine(markdown, ["must use when", "use when", "triggers"]);
  const boundaryLine = findLine(markdown, ["not for", "do not", "don't"]);
  const platformLabels = detectPlatforms(markdown);
  const triggerHints = extractTriggerHints(triggerLine || (containsChinese(description) ? description : ""));
  const boundaries = extractBoundaries(boundaryLine);

  const isInternetRouter =
    lower.includes("agent reach") ||
    lower.includes("internet") ||
    lower.includes("全网调研") ||
    lower.includes("小红书") ||
    lower.includes("reddit") ||
    lower.includes("youtube") ||
    platformLabels.length >= 3;

  let summary = "";
  if (isInternetRouter) {
    const platformText = platformLabels.length ? `，覆盖 ${platformLabels.join("、")} 等渠道` : "";
    summary = `用于从互联网和多平台获取内容${platformText}，适合搜索、调研、查找资料和读取链接。`;
  } else if (description.length >= 80 || containsChinese(description)) {
    summary = chineseDescriptionSummary(description);
  }

  return {
    summary,
    triggerHints,
    boundaries
  };
}

function findLine(markdown: string, needles: string[]) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => needles.some((needle) => line.toLowerCase().includes(needle)));
}

function detectPlatforms(text: string) {
  const platforms = [
    ["GitHub", /github/i],
    ["小红书", /小红书|xiaohongshu|xhs/i],
    ["Reddit", /reddit/i],
    ["YouTube", /youtube|yt/i],
    ["B站", /b站|bilibili/i],
    ["Twitter/X", /twitter|推特|x\.com/i],
    ["网页", /web|网页|internet|互联网/i]
  ] as const;

  return platforms.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function extractTriggerHints(text: string) {
  if (!text) {
    return [];
  }
  const hints: string[] = [];
  const lower = text.toLowerCase();
  if (/调研|research|搜索|search|查|找|look up/.test(lower)) {
    hints.push("当用户要求搜索、调研、查找信息或了解网上内容时");
  }
  if (/url|链接|github|小红书|reddit|youtube|bilibili|twitter|x\.com/.test(lower)) {
    hints.push("当用户提供网页链接、GitHub、社交平台、视频或播客地址时");
  }
  if (/platform|渠道|平台/.test(lower)) {
    hints.push("当任务需要跨平台获取资料或选择合适渠道时");
  }
  return hints.length ? hints : [cleanSentence(text)];
}

function extractBoundaries(line: string | undefined) {
  if (!line) {
    return [];
  }
  const cleaned = cleanSentence(line.replace(/^[-*\s]*/, "").replace(/^not for\s*:\s*/i, ""));
  if (!cleaned) {
    return [];
  }
  const boundaries = [cleaned];
  if (/发帖|评论|点赞|publish|comment|like/i.test(cleaned)) {
    boundaries.unshift("只负责获取和整理内容，不负责发帖、评论、点赞等写操作。");
  }
  return Array.from(new Set(boundaries));
}

function chineseDescriptionSummary(description: string) {
  const cleaned = cleanSentence(description);
  if (/must use when/i.test(cleaned)) {
    return "用于处理该技能说明中指定的触发场景，可查看下方触发条件确认具体边界。";
  }
  return cleaned.length > 90 ? `${cleaned.slice(0, 88)}...` : cleaned;
}

function cleanSentence(value: string) {
  return value
    .replace(/^description:\s*/i, "")
    .replace(/^must use when\s*/i, "")
    .replace(/^use when\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function containsChinese(value: string) {
  return /[\u4e00-\u9fff]/.test(value);
}
