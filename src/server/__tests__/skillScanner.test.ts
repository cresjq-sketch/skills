import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parseSkillMarkdown, scanSkills } from "../skillScanner";

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "skills-dashboard-"));
}

async function writeSkill(root: string, parts: string[], markdown: string) {
  const dir = path.join(root, ...parts);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "SKILL.md"), markdown, "utf8");
  return dir;
}

describe("parseSkillMarkdown", () => {
  test("parses yaml-style frontmatter and returns the markdown body", () => {
    const parsed = parseSkillMarkdown("---\nname: demo\ndescription: Demo skill\n---\n# Body");

    expect(parsed.metadata).toEqual({ name: "demo", description: "Demo skill" });
    expect(parsed.body.trim()).toBe("# Body");
  });

  test("parses folded yaml descriptions", () => {
    const parsed = parseSkillMarkdown(`---
name: demo
description: >
  First line
  second line
triggers:
  - demo
---
# Body`);

    expect(parsed.metadata.description).toBe("First line second line");
  });

  test("handles markdown without frontmatter", () => {
    const parsed = parseSkillMarkdown("# Plain skill");

    expect(parsed.metadata).toEqual({});
    expect(parsed.body).toBe("# Plain skill");
  });
});

describe("scanSkills", () => {
  test("finds direct Codex skills and nested plugin skills", async () => {
    const root = await tempDir();
    const codexRoot = path.join(root, "skills");
    const pluginRoot = path.join(root, "plugins");
    await writeSkill(codexRoot, ["alpha"], "---\nname: alpha\ndescription: Alpha skill\n---\nAlpha body");
    await writeSkill(pluginRoot, ["cache", "demo", "1.0.0", "skills", "beta"], "---\nname: beta\ndescription: Beta skill\n---\nBeta body");

    const result = await scanSkills({ codexSkillsRoot: codexRoot, pluginCacheRoot: pluginRoot });

    expect(result.errors).toEqual([]);
    expect(result.skills.map((skill) => skill.name).sort()).toEqual(["alpha", "beta"]);
    expect(result.skills.find((skill) => skill.name === "alpha")?.sourceType).toBe("codex");
    expect(result.skills.find((skill) => skill.name === "beta")?.sourceType).toBe("plugin");
  });

  test("keeps duplicate skill names as separate records", async () => {
    const root = await tempDir();
    const codexRoot = path.join(root, "skills");
    await writeSkill(codexRoot, ["one"], "---\nname: duplicate\ndescription: First\n---\nOne");
    await writeSkill(codexRoot, ["two"], "---\nname: duplicate\ndescription: Second\n---\nTwo");

    const result = await scanSkills({ codexSkillsRoot: codexRoot, pluginCacheRoot: path.join(root, "missing-plugins") });

    expect(result.skills).toHaveLength(2);
    expect(new Set(result.skills.map((skill) => skill.id)).size).toBe(2);
  });

  test("returns scan errors while still returning valid skills", async () => {
    const root = await tempDir();
    const codexRoot = path.join(root, "skills");
    await writeSkill(codexRoot, ["valid"], "---\nname: valid\ndescription: Valid skill\n---\nBody");

    const result = await scanSkills({
      codexSkillsRoot: codexRoot,
      pluginCacheRoot: path.join(root, "missing-plugins"),
      extraScanPaths: [path.join(root, "missing-extra")]
    });

    expect(result.skills.map((skill) => skill.name)).toEqual(["valid"]);
    expect(result.errors.map((error) => error.path).sort()).toEqual([
      path.join(root, "missing-extra"),
      path.join(root, "missing-plugins")
    ]);
  });
});
