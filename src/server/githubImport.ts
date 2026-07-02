import { cp, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { DEFAULT_CODEX_SKILLS_ROOT, DEFAULT_GITHUB_IMPORT_ROOT } from "./paths";
import { parseSkillMarkdown } from "./skillScanner";
import type {
  GitHubInstallRequest,
  GitHubInstallResponse,
  GitHubPreviewResponse,
  GitHubRepoInput,
  GitHubSkillCandidate
} from "../shared/types";

const execFileAsync = promisify(execFile);

export interface GitHubImportOptions {
  importRoot?: string;
  codexSkillsRoot?: string;
}

export function parseGitHubInput(input: string): GitHubRepoInput {
  const trimmed = input.trim().replace(/\.git$/, "");
  const shorthand = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(trimmed);
  if (shorthand) {
    return toRepoInput(shorthand[1], shorthand[2]);
  }

  const url = new URL(trimmed);
  if (url.hostname !== "github.com") {
    throw new Error("只支持 github.com 仓库地址");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("GitHub 地址缺少 owner/repo");
  }

  const [owner, repo] = parts;
  if (parts[2] === "tree" && parts[3]) {
    return toRepoInput(owner, repo, parts[3], parts.slice(4).join("/") || undefined);
  }

  return toRepoInput(owner, repo);
}

export async function previewGitHubSkills(
  input: string,
  options: GitHubImportOptions = {}
): Promise<GitHubPreviewResponse> {
  const repoInput = parseInputOrLocalPath(input);
  const importRoot = options.importRoot ?? DEFAULT_GITHUB_IMPORT_ROOT;
  await mkdir(importRoot, { recursive: true });
  const clonePath = await mkdtemp(path.join(importRoot, "repo-"));

  try {
    await cloneRepository(repoInput, clonePath);
    const scanRoot = repoInput.skillPath ? safeJoin(clonePath, repoInput.skillPath) : clonePath;
    const candidates = await findSkillCandidates(scanRoot, clonePath);
    if (!candidates.length) {
      throw new Error("这个仓库里没有找到 SKILL.md");
    }

    return {
      repository: repoInput.label,
      candidates,
      autoInstallCandidateId: candidates.length === 1 ? candidates[0].id : undefined,
      clonePath
    };
  } catch (error) {
    await cleanupClone(clonePath);
    throw error;
  }
}

export async function installGitHubSkill(
  request: GitHubInstallRequest,
  options: GitHubImportOptions = {}
): Promise<GitHubInstallResponse> {
  let preview: GitHubPreviewResponse | undefined;
  const codexSkillsRoot = options.codexSkillsRoot ?? DEFAULT_CODEX_SKILLS_ROOT;

  if (request.input) {
    preview = await previewGitHubSkills(request.input, options);
  }

  const clonePath = preview?.clonePath ?? request.clonePath;
  if (!clonePath) {
    throw new Error("缺少可安装的 GitHub 仓库预览");
  }

  try {
    const candidates = preview?.candidates ?? (await findSkillCandidates(clonePath, clonePath));
    const candidateId = request.candidateId ?? preview?.autoInstallCandidateId;
    const candidate = candidateId
      ? candidates.find((item) => item.id === candidateId)
      : candidates.length === 1
        ? candidates[0]
        : undefined;

    if (!candidate) {
      throw new Error("请选择要安装的技能");
    }

    const sourcePath = safeJoin(clonePath, candidate.relativePath);
    const targetName = sanitizeSkillName(candidate.name);
    const targetPath = path.join(codexSkillsRoot, targetName);
    if (await exists(targetPath)) {
      throw new Error(`技能目录已经存在: ${targetPath}`);
    }

    await mkdir(codexSkillsRoot, { recursive: true });
    await cp(sourcePath, targetPath, { recursive: true });
    const cleanupWarning = await cleanupClone(clonePath);
    return {
      installedPath: targetPath,
      installedSkillName: targetName,
      cleanupWarning
    };
  } catch (error) {
    await cleanupClone(clonePath);
    throw error;
  }
}

function toRepoInput(owner: string, repo: string, branch?: string, skillPath?: string): GitHubRepoInput {
  return {
    owner,
    repo,
    branch,
    skillPath,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    label: `${owner}/${repo}`
  };
}

function parseInputOrLocalPath(input: string): GitHubRepoInput {
  if (input.startsWith("/") || input.startsWith(".")) {
    const absolute = path.resolve(input);
    return {
      owner: "local",
      repo: path.basename(absolute),
      cloneUrl: absolute,
      label: absolute
    };
  }
  return parseGitHubInput(input);
}

async function cloneRepository(repoInput: GitHubRepoInput, clonePath: string) {
  const args = ["clone", "--depth", "1"];
  if (repoInput.branch) {
    args.push("--branch", repoInput.branch);
  }
  args.push(repoInput.cloneUrl, clonePath);
  await execFileAsync("git", args);
}

async function findSkillCandidates(root: string, cloneRoot: string): Promise<GitHubSkillCandidate[]> {
  if (!(await isDirectory(root))) {
    throw new Error("指定的技能路径不存在");
  }
  const candidates: GitHubSkillCandidate[] = [];
  await walk(root, async (dir) => {
    const skillFile = path.join(dir, "SKILL.md");
    if (!(await exists(skillFile))) {
      return;
    }
    const markdown = await readFile(skillFile, "utf8");
    const parsed = parseSkillMarkdown(markdown);
    const relativePath = path.relative(cloneRoot, dir);
    candidates.push({
      id: Buffer.from(relativePath).toString("base64url"),
      name: parsed.metadata.name || path.basename(dir),
      description: parsed.metadata.description || "",
      relativePath
    });
  });
  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

async function walk(dir: string, visit: (dir: string) => Promise<void>) {
  await visit(dir);
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(dir, { withFileTypes: true }));
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== ".git") {
      await walk(path.join(dir, entry.name), visit);
    }
  }
}

function safeJoin(root: string, relativePath: string) {
  const result = path.resolve(root, relativePath);
  const resolvedRoot = path.resolve(root);
  if (result !== resolvedRoot && !result.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("技能路径不安全");
  }
  return result;
}

function sanitizeSkillName(name: string) {
  return name.replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "") || "imported-skill";
}

async function cleanupClone(clonePath: string) {
  try {
    await rm(clonePath, { recursive: true, force: true });
    return undefined;
  } catch (error) {
    return error instanceof Error ? `临时目录清理失败: ${error.message}` : "临时目录清理失败";
  }
}

async function exists(value: string) {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(value: string) {
  try {
    return (await stat(value)).isDirectory();
  } catch {
    return false;
  }
}
