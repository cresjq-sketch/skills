import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_CODEX_SKILLS_ROOT,
  DEFAULT_PLUGIN_CACHE_ROOT
} from "./paths";
import type {
  ParsedSkillMarkdown,
  ScanSkillsOptions,
  SkillRecord,
  SkillScanError,
  SkillScanResult,
  SkillSourceType
} from "../shared/types";

export function normalizeSkillPath(value: string) {
  return path.resolve(value);
}

export function parseSkillMarkdown(markdown: string): ParsedSkillMarkdown {
  if (!markdown.startsWith("---\n")) {
    return { metadata: {}, body: markdown };
  }

  const endIndex = markdown.indexOf("\n---", 4);
  if (endIndex === -1) {
    return { metadata: {}, body: markdown };
  }

  const frontmatter = markdown.slice(4, endIndex);
  const body = markdown.slice(endIndex + 4).replace(/^\n/, "");
  const metadata: Record<string, string> = {};

  const lines = frontmatter.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (value === ">" || value === "|") {
      const block: string[] = [];
      for (let blockIndex = index + 1; blockIndex < lines.length; blockIndex += 1) {
        const blockLine = lines[blockIndex];
        if (blockLine.trim() && !/^\s/.test(blockLine)) {
          break;
        }
        if (blockLine.trim()) {
          block.push(blockLine.trim());
        }
        index = blockIndex;
      }
      value = block.join(" ").replace(/\s+/g, " ").trim();
    }
    if (key) {
      metadata[key] = value;
    }
  }

  return { metadata, body };
}

export async function scanSkills(options: ScanSkillsOptions = {}): Promise<SkillScanResult> {
  const codexSkillsRoot = normalizeSkillPath(options.codexSkillsRoot ?? DEFAULT_CODEX_SKILLS_ROOT);
  const pluginCacheRoot = normalizeSkillPath(options.pluginCacheRoot ?? DEFAULT_PLUGIN_CACHE_ROOT);
  const extraScanPaths = (options.extraScanPaths ?? []).map(normalizeSkillPath);
  const errors: SkillScanError[] = [];
  const skillFiles: Array<{ file: string; root: string; sourceType: SkillSourceType }> = [];

  await collectDirectSkillFiles(codexSkillsRoot, "codex", skillFiles, errors);
  await collectPluginSkillFiles(pluginCacheRoot, skillFiles, errors);

  for (const extraPath of extraScanPaths) {
    await collectDirectSkillFiles(extraPath, "custom", skillFiles, errors);
  }

  const skills: SkillRecord[] = [];
  for (const entry of skillFiles) {
    try {
      const markdown = await readFile(entry.file, "utf8");
      const parsed = parseSkillMarkdown(markdown);
      const skillDir = path.dirname(entry.file);
      const fallbackName = path.basename(skillDir);
      const name = parsed.metadata.name || fallbackName;
      const description = parsed.metadata.description || "";
      skills.push({
        id: createSkillId(entry.file, name),
        name,
        description,
        sourceType: entry.sourceType,
        sourceRoot: entry.root,
        skillDir,
        skillFile: entry.file,
        markdown,
        metadata: parsed.metadata
      });
    } catch (error) {
      errors.push({ path: entry.file, message: errorMessage(error) });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name) || a.skillFile.localeCompare(b.skillFile));
  return { skills, errors };
}

async function collectDirectSkillFiles(
  root: string,
  sourceType: SkillSourceType,
  skillFiles: Array<{ file: string; root: string; sourceType: SkillSourceType }>,
  errors: SkillScanError[]
) {
  const entries = await safeReadDir(root, errors);
  if (!entries) {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillFile = path.join(root, entry.name, "SKILL.md");
    if (await isFile(skillFile)) {
      skillFiles.push({ file: skillFile, root, sourceType });
    }
  }
}

async function collectPluginSkillFiles(
  root: string,
  skillFiles: Array<{ file: string; root: string; sourceType: SkillSourceType }>,
  errors: SkillScanError[]
) {
  if (!(await isDirectory(root))) {
    errors.push({ path: root, message: "Directory does not exist or is not readable" });
    return;
  }

  await walk(root, async (dir) => {
    if (path.basename(path.dirname(dir)) !== "skills") {
      return;
    }
    const skillFile = path.join(dir, "SKILL.md");
    if (await isFile(skillFile)) {
      skillFiles.push({ file: skillFile, root, sourceType: "plugin" });
    }
  });
}

async function walk(dir: string, visitDirectory: (dir: string) => Promise<void>) {
  await visitDirectory(dir);
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await walk(path.join(dir, entry.name), visitDirectory);
    }
  }
}

async function safeReadDir(root: string, errors: SkillScanError[]) {
  try {
    return await readdir(root, { withFileTypes: true });
  } catch (error) {
    errors.push({ path: root, message: errorMessage(error) });
    return null;
  }
}

async function isFile(file: string) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(dir: string) {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

function createSkillId(file: string, name: string) {
  return Buffer.from(`${normalizeSkillPath(file)}:${name}`).toString("base64url");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
