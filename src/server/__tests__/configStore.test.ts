import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { loadConfig, saveConfig, updateConfig } from "../configStore";
import type { SkillConfig } from "../../shared/types";

async function configPath() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "skills-config-"));
  return path.join(dir, "skills-config.json");
}

describe("configStore", () => {
  test("returns the default config when the config file is missing", async () => {
    await expect(loadConfig(await configPath())).resolves.toEqual({
      extraScanPaths: [],
      overrides: {},
      customEntries: []
    });
  });

  test("saves and loads scan paths, overrides, and custom entries", async () => {
    const file = await configPath();
    const config: SkillConfig = {
      extraScanPaths: ["/tmp/skills"],
      overrides: {
        skillA: { note: "Useful", category: "Writing", hidden: true }
      },
      customEntries: [{ id: "customA", name: "Custom A", path: "/tmp/custom-a" }]
    };

    await saveConfig(config, file);

    await expect(loadConfig(file)).resolves.toEqual(config);
  });

  test("patching one override field preserves existing override fields", async () => {
    const file = await configPath();
    await saveConfig(
      {
        extraScanPaths: [],
        overrides: {
          skillA: { note: "Old note", category: "Ops", hidden: true }
        },
        customEntries: []
      },
      file
    );

    const updated = await updateConfig({ overrides: { skillA: { note: "New note" } } }, file);

    expect(updated.overrides.skillA).toEqual({ note: "New note", category: "Ops", hidden: true });
  });

  test("throws a readable error for invalid JSON", async () => {
    const file = await configPath();
    await writeFile(file, "{not-json", "utf8");

    await expect(loadConfig(file)).rejects.toThrow(/Invalid skills config JSON/);
  });
});
