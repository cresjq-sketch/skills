import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { validateLocalSkillDirectory } from "../importLocal";

async function tempDir() {
  return mkdtemp(path.join(os.tmpdir(), "skills-import-"));
}

describe("validateLocalSkillDirectory", () => {
  test("accepts a directory containing SKILL.md", async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, "SKILL.md"), "---\nname: imported\n---\nBody", "utf8");

    await expect(validateLocalSkillDirectory(dir)).resolves.toEqual({ valid: true, path: dir });
  });

  test("rejects a directory without SKILL.md", async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, "nested"));

    await expect(validateLocalSkillDirectory(dir)).resolves.toMatchObject({
      valid: false,
      path: dir,
      message: "Directory does not contain SKILL.md"
    });
  });

  test("rejects a non-existent path", async () => {
    const dir = path.join(await tempDir(), "missing");

    await expect(validateLocalSkillDirectory(dir)).resolves.toMatchObject({
      valid: false,
      path: dir,
      message: "Path does not exist or is not a directory"
    });
  });
});
