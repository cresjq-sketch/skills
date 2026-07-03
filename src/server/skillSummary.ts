import type { SkillOverride, SkillRecord, SkillSummary } from "../shared/types";

interface CategoryRule {
  category: string;
  keywords: string[];
  summary: string;
  triggerHints: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "需求规划",
    keywords: ["brainstorming", "writing-plans", "requirements", "user intent", "implementation plan", "需求", "规划"],
    summary: "适合在开始实现前澄清目标、需求、方案和验收标准。",
    triggerHints: ["开始做功能、组件、创意方案或行为修改之前"]
  },
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
    keywords: ["git", "github", "codebase", "repo", "repository", "pull request", "commit", "代码", "仓库"],
    summary: "适合代码仓库、GitHub、分支、提交、PR 和代码协作相关任务。",
    triggerHints: ["需要查看仓库、提交代码、处理 PR 或 GitHub 内容时"]
  },
  {
    category: "图像设计",
    keywords: ["image", "canva", "photo", "poster", "visual", "图像", "图片", "海报"],
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
  const sourceDescription = sourceDescriptionFor(skill);
  const classificationText = [
    skill.name,
    sourceDescription,
    meaningfulPathText(skill.skillDir),
  ]
    .join(" ")
    .toLowerCase();

  const rule = CATEGORY_RULES.find((candidate) => candidate.keywords.some((keyword) => keywordMatches(classificationText, keyword)));
  const sourceSignals = extractSourceSignals(skill, sourceDescription, rule);

  return {
    displayName: override.displayName || skill.name,
    category: override.category || sourceSignals.category || rule?.category || "通用技能",
    summary: override.summary || sourceSignals.summary || rule?.summary || "查看原文了解这个技能的具体用途。",
    triggerHints: sourceSignals.triggerHints.length
      ? sourceSignals.triggerHints
      : rule?.triggerHints ?? ["不确定时可打开原文查看触发条件和使用边界"]
  };
}

function meaningfulPathText(value: string) {
  return value
    .split(/[\\/]/)
    .filter((part) => part && !["skills", "skill", "cache", "plugins", "plugin", "tmp"].includes(part.toLowerCase()))
    .join(" ");
}

function keywordMatches(text: string, keyword: string) {
  const normalizedKeyword = keyword.toLowerCase();
  if (/[\u4e00-\u9fff]/.test(normalizedKeyword)) {
    return text.includes(normalizedKeyword);
  }
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

function extractSourceSignals(skill: SkillRecord, description: string, rule: CategoryRule | undefined) {
  const sourceText = [skill.name, description, meaningfulPathText(skill.skillDir)].join(" ");
  const lower = sourceText.toLowerCase();
  const triggerLine = findLine(skill.markdown, ["must use when", "use when", "triggers"]);
  const platformLabels = detectPlatforms(sourceText);
  const triggerHints = extractTriggerHints(triggerLine || description);

  const isInternetRouter =
    lower.includes("agent reach") ||
    lower.includes("internet") ||
    lower.includes("全网调研") ||
    lower.includes("小红书") ||
    lower.includes("reddit") ||
    lower.includes("youtube") ||
    platformLabels.length >= 3;

  let summary = "";
  let category = "";
  if (isInternetRouter) {
    const platformText = platformLabels.length ? `，覆盖 ${platformLabels.join("、")} 等渠道` : "";
    summary = `用于从互联网和多平台获取内容${platformText}，适合搜索、调研、查找资料和读取链接。`;
    category = "搜索调研";
  } else {
    summary = chineseDescriptionSummary(description, skill.name, rule?.category);
  }

  return {
    category,
    summary,
    triggerHints
  };
}

function sourceDescriptionFor(skill: SkillRecord) {
  const metadataDescription = skill.metadata.description?.trim();
  if (metadataDescription && ![">", "|"].includes(metadataDescription) && metadataDescription !== skill.markdown.trim()) {
    return metadataDescription;
  }
  const frontmatterDescription = parseFrontmatterDescription(skill.markdown);
  if (frontmatterDescription) {
    return frontmatterDescription;
  }
  return skill.description.trim();
}

function parseFrontmatterDescription(markdown: string) {
  if (!markdown.startsWith("---\n")) {
    return "";
  }
  const endIndex = markdown.indexOf("\n---", 4);
  if (endIndex === -1) {
    return "";
  }
  const lines = markdown.slice(4, endIndex).split(/\r?\n/);
  const descriptionIndex = lines.findIndex((line) => line.trimStart().toLowerCase().startsWith("description:"));
  if (descriptionIndex === -1) {
    return "";
  }
  const rawValue = lines[descriptionIndex].split(":").slice(1).join(":").trim();
  if (rawValue === ">" || rawValue === "|") {
    const block: string[] = [];
    for (let index = descriptionIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() && !/^\s/.test(line)) {
        break;
      }
      if (line.trim()) {
        block.push(line.trim());
      }
    }
    return block.join(" ").replace(/\s+/g, " ").trim();
  }
  return rawValue.replace(/^["']|["']$/g, "").trim();
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
  if (/browser|website|websites|click|typing|screenshot|网页|浏览器|点击|填写/.test(lower)) {
    hints.push("打开网页、点击、填写或检查页面时");
  }
  if (/creative work|creating features|building components|adding functionality|modifying behavior|requirements and design/.test(lower)) {
    hints.push("开始做功能、组件、创意方案或行为修改之前");
  }
  if (/platform|渠道|平台/.test(lower)) {
    hints.push("当任务需要跨平台获取资料或选择合适渠道时");
  }
  return hints.length ? hints : [cleanSentence(text)];
}

function chineseDescriptionSummary(description: string, skillName: string, category?: string) {
  const cleaned = cleanSentence(description);
  const lower = `${skillName} ${cleaned}`.toLowerCase();
  if (!cleaned) {
    return "";
  }
  if (/creative work|creating features|building components|adding functionality|modifying behavior|user intent|requirements and design/i.test(lower)) {
    return "用于在创建功能、组件或修改行为之前澄清用户意图、需求和设计方案。";
  }
  if (/must use when/i.test(cleaned)) {
    return "用于处理该技能说明中指定的触发场景。";
  }
  if (/computer-use|local mac apps|operating app ui|clicking, typing, scrolling, dragging/i.test(lower)) {
    return "用于通过 Computer Use 操作本机 Mac 应用，适合点击、输入、滚动、拖拽、按键和设置界面值等任务。";
  }
  if (/control-in-app-browser|in-app browser|localhost|127\.0\.0\.1|file:\/\/|screenshot/i.test(lower)) {
    return "用于控制 Codex 内置浏览器，适合打开、导航、检查、测试、点击、输入、截图或验证本地网页和本地应用。";
  }
  if (/control-chrome|chrome browser|chrome/i.test(lower)) {
    return "用于控制本机 Chrome 浏览器，适合处理依赖现有登录状态、标签页或扩展的网页操作。";
  }
  if (/\.docx|word|google docs|document artifacts|redline/i.test(lower)) {
    return "用于创建、编辑、批注和检查 Word/DOCX 或 Google Docs 目标文档，并通过渲染预览确认排版。";
  }
  if (/pdf/i.test(lower) && category === "文档办公") {
    return "用于读取、创建、检查和渲染 PDF 文件，适合需要确认版面、提取内容或生成 PDF 的任务。";
  }
  if (/spreadsheet|excel|csv|xlsx|google sheets/i.test(lower)) {
    return "用于创建、修改、分析和检查表格文件，适合处理 Excel、CSV、TSV 或 Google Sheets 目标表格。";
  }
  if (/presentation|slides|powerpoint|google slides/i.test(lower)) {
    return "用于创建或编辑演示文稿，适合处理 PowerPoint 或 Google Slides 目标幻灯片。";
  }
  if (/academic research|deep research|literature review|systematic review|fact-check/i.test(lower)) {
    return "用于严谨学术调研和文献分析，适合深度研究、文献综述、事实核查、系统综述和研究问题梳理。";
  }
  if (/paper|citation|reviewer|manuscript|rebuttal/i.test(lower) && category === "学术写作") {
    return "用于论文写作、审稿反馈处理、引用检查和学术文本优化。";
  }
  if (/image|photo|poster|canva|visual/i.test(lower)) {
    return "用于生成或编辑图像、设计稿和视觉素材，适合海报、照片、Canva 设计或视觉变体任务。";
  }
  if (containsChinese(cleaned)) {
    return cleaned.length > 90 ? `${cleaned.slice(0, 88)}...` : cleaned;
  }
  return "";
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
