import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG_PATH } from "./paths";
import type { SkillConfig, SkillConfigPatch, SkillOverride } from "../shared/types";

export const DEFAULT_CONFIG: SkillConfig = {
  extraScanPaths: [],
  overrides: {},
  customEntries: []
};

export async function loadConfig(configPath = DEFAULT_CONFIG_PATH): Promise<SkillConfig> {
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SkillConfig>;
    return normalizeConfig(parsed);
  } catch (error) {
    if (isNotFound(error)) {
      return structuredClone(DEFAULT_CONFIG);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid skills config JSON at ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

export async function saveConfig(config: SkillConfig, configPath = DEFAULT_CONFIG_PATH) {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(normalizeConfig(config), null, 2)}\n`, "utf8");
}

export async function updateConfig(patch: SkillConfigPatch, configPath = DEFAULT_CONFIG_PATH) {
  const current = await loadConfig(configPath);
  const next: SkillConfig = {
    extraScanPaths: patch.extraScanPaths ?? current.extraScanPaths,
    customEntries: patch.customEntries ?? current.customEntries,
    overrides: mergeOverrides(current.overrides, patch.overrides)
  };
  await saveConfig(next, configPath);
  return next;
}

function normalizeConfig(config: Partial<SkillConfig>): SkillConfig {
  return {
    extraScanPaths: Array.isArray(config.extraScanPaths) ? config.extraScanPaths : [],
    overrides: isRecord(config.overrides) ? config.overrides : {},
    customEntries: Array.isArray(config.customEntries) ? config.customEntries : []
  };
}

function mergeOverrides(
  current: Record<string, SkillOverride>,
  patch?: Record<string, SkillOverride>
) {
  if (!patch) {
    return current;
  }

  const next = { ...current };
  for (const [id, override] of Object.entries(patch)) {
    next[id] = { ...(next[id] ?? {}), ...override };
  }
  return next;
}

function isRecord(value: unknown): value is Record<string, SkillOverride> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}
