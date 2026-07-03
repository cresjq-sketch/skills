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

export interface SkillViewRecord extends SkillRecord {
  override: SkillOverride;
  summary: SkillSummary;
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
  displayName?: string;
  note?: string;
  category?: string;
  summary?: string;
  hidden?: boolean;
}

export interface SkillSummary {
  displayName: string;
  category: string;
  summary: string;
  triggerHints: string[];
  boundaries: string[];
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

export interface SkillConfigPatch {
  extraScanPaths?: string[];
  overrides?: Record<string, SkillOverride>;
  customEntries?: CustomSkillEntry[];
}

export interface LocalImportValidation {
  valid: boolean;
  path: string;
  message?: string;
}

export interface SkillsApiResponse {
  skills: SkillViewRecord[];
  errors: SkillScanError[];
  config: SkillConfig;
}

export interface GitHubRepoInput {
  owner: string;
  repo: string;
  branch?: string;
  skillPath?: string;
  cloneUrl: string;
  label: string;
}

export interface GitHubSkillCandidate {
  id: string;
  name: string;
  description: string;
  relativePath: string;
}

export interface GitHubPreviewResponse {
  repository: string;
  candidates: GitHubSkillCandidate[];
  autoInstallCandidateId?: string;
  clonePath: string;
  cleanupWarning?: string;
}

export interface GitHubInstallRequest {
  input?: string;
  clonePath?: string;
  candidateId?: string;
}

export interface GitHubInstallResponse {
  installedPath: string;
  installedSkillName: string;
  cleanupWarning?: string;
}
