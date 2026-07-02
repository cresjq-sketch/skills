import os from "node:os";
import path from "node:path";

export const PROJECT_ROOT = process.cwd();
export const DEFAULT_CODEX_SKILLS_ROOT = path.join(os.homedir(), ".codex", "skills");
export const DEFAULT_PLUGIN_CACHE_ROOT = path.join(os.homedir(), ".codex", "plugins", "cache");
export const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, "data", "skills-config.json");
