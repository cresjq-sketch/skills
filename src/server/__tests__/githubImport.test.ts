import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  installGitHubSkill,
  parseGitHubInput,
  previewGitHubSkills
} from "../githubImport";

const execFileAsync = promisify(execFile);

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "skills-github-"));
}

async function createRepo(structure: Array<{ dir: string; name: string; description: string }>) {
  const repo = await tempDir();
  await execFileAsync("git", ["init"], { cwd: repo });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
  await writeFile(path.join(repo, "README.md"), "# test repo\n", "utf8");
  for (const item of structure) {
    const dir = path.join(repo, item.dir);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "SKILL.md"),
      `---\nname: ${item.name}\ndescription: ${item.description}\n---\n# ${item.name}`,
      "utf8"
    );
  }
  await execFileAsync("git", ["add", "."], { cwd: repo });
  await execFileAsync("git", ["commit", "-m", "add skills"], { cwd: repo });
  return repo;
}

describe("parseGitHubInput", () => {
  test("parses owner repo shorthand", () => {
    expect(parseGitHubInput("owner/repo")).toMatchObject({
      owner: "owner",
      repo: "repo",
      cloneUrl: "https://github.com/owner/repo.git"
    });
  });

  test("parses GitHub tree URLs with branch and skill path", () => {
    expect(parseGitHubInput("https://github.com/owner/repo/tree/main/path/to/skill")).toMatchObject({
      owner: "owner",
      repo: "repo",
      branch: "main",
      skillPath: "path/to/skill"
    });
  });
});

describe("GitHub import", () => {
  test("previews a repository with one skill", async () => {
    const repo = await createRepo([{ dir: "my-skill", name: "my-skill", description: "Search web" }]);
    const importRoot = await tempDir();

    const preview = await previewGitHubSkills(repo, { importRoot });

    expect(preview.candidates).toHaveLength(1);
    expect(preview.autoInstallCandidateId).toBe(preview.candidates[0].id);
    expect(preview.candidates[0]).toMatchObject({ name: "my-skill", relativePath: "my-skill" });
  });

  test("previews multiple skills", async () => {
    const repo = await createRepo([
      { dir: "skills/a", name: "a", description: "A" },
      { dir: "skills/b", name: "b", description: "B" }
    ]);
    const importRoot = await tempDir();

    const preview = await previewGitHubSkills(repo, { importRoot });

    expect(preview.candidates.map((candidate) => candidate.name).sort()).toEqual(["a", "b"]);
    expect(preview.autoInstallCandidateId).toBeUndefined();
  });

  test("rejects repositories with no SKILL.md", async () => {
    const repo = await createRepo([]);
    const importRoot = await tempDir();

    await expect(previewGitHubSkills(repo, { importRoot })).rejects.toThrow(/没有找到 SKILL.md/);
  });

  test("installs selected skill and rejects overwrite", async () => {
    const repo = await createRepo([{ dir: "my-skill", name: "my-skill", description: "Search web" }]);
    const importRoot = await tempDir();
    const codexSkillsRoot = await tempDir();
    const preview = await previewGitHubSkills(repo, { importRoot });

    const installed = await installGitHubSkill(
      { clonePath: preview.clonePath, candidateId: preview.candidates[0].id },
      { importRoot, codexSkillsRoot }
    );

    expect(installed.installedSkillName).toBe("my-skill");
    await expect(readFile(path.join(installed.installedPath, "SKILL.md"), "utf8")).resolves.toContain("my-skill");

    const secondPreview = await previewGitHubSkills(repo, { importRoot });
    await expect(
      installGitHubSkill(
        { clonePath: secondPreview.clonePath, candidateId: secondPreview.candidates[0].id },
        { importRoot, codexSkillsRoot }
      )
    ).rejects.toThrow(/已经存在/);
  });
});
