import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createApp } from "../index";

let server: http.Server | undefined;
let baseUrl = "";
const execFileAsync = promisify(execFile);

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "skills-api-"));
}

async function start(options: Parameters<typeof createApp>[0]) {
  const app = createApp(options);
  server = app.listen(0);
  await new Promise<void>((resolve) => server?.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not read test server address");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function writeSkill(root: string, name: string) {
  const dir = path.join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: ${name} desc\n---\n# ${name}`, "utf8");
  return dir;
}

async function createGitRepoWithSkill(root: string) {
  const repo = path.join(root, "repo");
  await mkdir(path.join(repo, "skill-one"), { recursive: true });
  await writeFile(path.join(repo, "README.md"), "# repo\n", "utf8");
  await writeFile(
    path.join(repo, "skill-one", "SKILL.md"),
    "---\nname: skill-one\ndescription: Search web\n---\n# skill-one",
    "utf8"
  );
  await execFileAsync("git", ["init"], { cwd: repo });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repo });
  await execFileAsync("git", ["add", "."], { cwd: repo });
  await execFileAsync("git", ["commit", "-m", "add skill"], { cwd: repo });
  return repo;
}

beforeEach(() => {
  server = undefined;
  baseUrl = "";
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

describe("skills API", () => {
  test("returns scanned skills with overrides and full markdown details", async () => {
    const root = await tempDir();
    const skillsRoot = path.join(root, "skills");
    const configPath = path.join(root, "config.json");
    await writeSkill(skillsRoot, "alpha");

    await start({
      codexSkillsRoot: skillsRoot,
      pluginCacheRoot: path.join(root, "plugins"),
      configPath
    });

    const listResponse = await fetch(`${baseUrl}/api/skills`);
    const list = await listResponse.json();
    expect(list.skills).toHaveLength(1);
    expect(list.skills[0]).toMatchObject({ name: "alpha", override: {} });

    const detailResponse = await fetch(`${baseUrl}/api/skills/${list.skills[0].id}`);
    const detail = await detailResponse.json();
    expect(detail.markdown).toContain("# alpha");
  });

  test("persists config patches", async () => {
    const root = await tempDir();
    await start({
      codexSkillsRoot: path.join(root, "skills"),
      pluginCacheRoot: path.join(root, "plugins"),
      configPath: path.join(root, "config.json")
    });

    const response = await fetch(`${baseUrl}/api/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overrides: { skillA: { note: "hello", category: "Ops" } } })
    });

    expect(response.status).toBe(200);
    const config = await response.json();
    expect(config.overrides.skillA).toEqual({ note: "hello", category: "Ops" });
  });

  test("adds a valid local skill directory to extra scan paths", async () => {
    const root = await tempDir();
    const customSkill = await writeSkill(root, "custom");
    await start({
      codexSkillsRoot: path.join(root, "skills"),
      pluginCacheRoot: path.join(root, "plugins"),
      configPath: path.join(root, "config.json")
    });

    const response = await fetch(`${baseUrl}/api/import/local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: customSkill })
    });

    expect(response.status).toBe(200);
    const config = await response.json();
    expect(config.extraScanPaths).toContain(customSkill);
  });

  test("rejects invalid local imports", async () => {
    const root = await tempDir();
    await start({
      codexSkillsRoot: path.join(root, "skills"),
      pluginCacheRoot: path.join(root, "plugins"),
      configPath: path.join(root, "config.json")
    });

    const response = await fetch(`${baseUrl}/api/import/local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: path.join(root, "missing") })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Path does not exist or is not a directory"
    });
  });

  test("previews and installs a GitHub skill", async () => {
    const root = await tempDir();
    const repo = await createGitRepoWithSkill(root);
    const codexSkillsRoot = path.join(root, "codex-skills");
    await start({
      codexSkillsRoot,
      pluginCacheRoot: path.join(root, "plugins"),
      configPath: path.join(root, "config.json"),
      githubImportOptions: {
        importRoot: path.join(root, "imports"),
        codexSkillsRoot
      }
    });

    const previewResponse = await fetch(`${baseUrl}/api/import/github/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: repo })
    });
    const preview = await previewResponse.json();

    expect(preview.candidates).toHaveLength(1);

    const installResponse = await fetch(`${baseUrl}/api/import/github/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clonePath: preview.clonePath, candidateId: preview.candidates[0].id })
    });

    expect(installResponse.status).toBe(200);
    await expect(installResponse.json()).resolves.toMatchObject({
      installedSkillName: "skill-one"
    });
  });
});
