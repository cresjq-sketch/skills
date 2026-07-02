export type SkillSourceType = "codex" | "plugin" | "custom";

export interface ParsedSkillMarkdown {
  metadata: Record<string, string>;
  body: string;
}

export interface SkillRecord {
  id: string;
  name: string;
  description: string;
  sourceType: SkillSourceType;
  sourceRoot: string;
  skillDir: string;
  skillFile: string;
  markdown: string;
  metadata: Record<string, string>;
}

export interface SkillScanError {
  path: string;
  message: string;
}

export interface SkillScanResult {
  skills: SkillRecord[];
  errors: SkillScanError[];
}

export interface ScanSkillsOptions {
  codexSkillsRoot?: string;
  pluginCacheRoot?: string;
  extraScanPaths?: string[];
}

export interface SkillOverride {
  note?: string;
  category?: string;
  hidden?: boolean;
}

export interface CustomSkillEntry {
  id: string;
  name: string;
  path: string;
}

export interface SkillConfig {
  extraScanPaths: string[];
  overrides: Record<string, SkillOverride>;
  customEntries: CustomSkillEntry[];
}
