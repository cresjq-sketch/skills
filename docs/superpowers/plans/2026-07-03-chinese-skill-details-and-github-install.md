# Chinese Skill Details And GitHub Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the skills dashboard Chinese-first and add safe installation from public GitHub repositories.

**Architecture:** Add deterministic skill summary derivation on the server and expose it in existing skill API records. Add a GitHub import module that parses GitHub URLs, clones public repositories into temporary directories, scans for `SKILL.md`, and copies selected skills into the Codex skills directory. Update the React dashboard to show Chinese summary panels before raw markdown and add a GitHub install flow.

**Tech Stack:** Node.js, TypeScript, React, Express, Vitest, Testing Library, local `git` CLI.

## Global Constraints

- Default display must be Chinese-first.
- Raw `SKILL.md` must remain available.
- Manual Chinese display name, category, and summary must persist in `data/skills-config.json`.
- GitHub installation supports public repositories only.
- The server must not execute code from cloned repositories.
- GitHub install must reject unsupported URL formats, repositories with no `SKILL.md`, invalid candidate paths, and existing target directories.
- Temporary clone directories must be deleted after install or failure; cleanup failure returns a warning.
- Private GitHub install, update, uninstall, overwrite, and LLM translation are out of scope.

---

## File Structure

- `src/server/skillSummary.ts`: derive Chinese category, summary, and trigger hints.
- `src/server/githubImport.ts`: parse GitHub inputs, clone, scan candidates, install selected skill.
- `src/server/index.ts`: add GitHub preview/install API and include summaries in skill responses.
- `src/shared/types.ts`: add summary, override, and GitHub import response types.
- `src/App.tsx`: show Chinese summary cards, raw markdown secondary panel, and GitHub install controls.
- `src/styles.css`: style Chinese-first detail layout and GitHub candidate list.
- `src/server/__tests__/skillSummary.test.ts`: summary tests.
- `src/server/__tests__/githubImport.test.ts`: GitHub parser/install tests using local git repos.
- `src/server/__tests__/api.test.ts`: API coverage for GitHub endpoints.
- `src/App.test.tsx`: UI tests for Chinese detail and GitHub install flow.
- `README.md`: document GitHub install support.

---

### Task 1: Chinese Skill Summaries

**Files:**
- Create: `src/server/skillSummary.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/server/index.ts`
- Test: `src/server/__tests__/skillSummary.test.ts`

**Interfaces:**
- Consumes: `SkillRecord`, `SkillOverride`
- Produces: `SkillSummary`
- Produces: `deriveSkillSummary(skill: SkillRecord, override?: SkillOverride): SkillSummary`

- [ ] **Step 1: Write failing summary tests**

Create tests that assert:

```ts
expect(deriveSkillSummary(skillWith("academic-paper", "write paper citation review")).category).toBe("学术写作");
expect(deriveSkillSummary(skillWith("browser", "open websites and click")).category).toBe("浏览器/电脑控制");
expect(deriveSkillSummary(skillWith("unknown", "")).summary).toBe("查看原文了解这个技能的具体用途。");
expect(deriveSkillSummary(skill, { displayName: "论文助手", category: "我的分类", summary: "帮我写论文" })).toMatchObject({
  displayName: "论文助手",
  category: "我的分类",
  summary: "帮我写论文"
});
```

- [ ] **Step 2: Run red**

Run: `npm test -- src/server/__tests__/skillSummary.test.ts`

Expected: FAIL because `skillSummary.ts` does not exist.

- [ ] **Step 3: Implement summary module and types**

Add `SkillSummary`, extend `SkillOverride` with `displayName` and `summary`, and derive category/summary/trigger hints using deterministic keyword groups from the spec.

- [ ] **Step 4: Add summaries to API records**

Update `readSkills()` in `src/server/index.ts` so each `SkillViewRecord` includes `summary`.

- [ ] **Step 5: Run green**

Run: `npm test -- src/server/__tests__/skillSummary.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/shared/types.ts src/server/skillSummary.ts src/server/index.ts src/server/__tests__/skillSummary.test.ts
git commit -m "feat: add Chinese skill summaries"
```

---

### Task 2: GitHub Import Backend

**Files:**
- Create: `src/server/githubImport.ts`
- Modify: `src/server/paths.ts`
- Modify: `src/server/index.ts`
- Test: `src/server/__tests__/githubImport.test.ts`
- Test: `src/server/__tests__/api.test.ts`

**Interfaces:**
- Produces: `parseGitHubInput(input: string): GitHubRepoInput`
- Produces: `previewGitHubSkills(input: string, options: GitHubImportOptions): Promise<GitHubPreviewResponse>`
- Produces: `installGitHubSkill(request: GitHubInstallRequest, options: GitHubImportOptions): Promise<GitHubInstallResponse>`

- [ ] **Step 1: Write failing GitHub import tests**

Use local temporary git repositories via `git init`, commit skill directories, then test:

```ts
expect(parseGitHubInput("owner/repo")).toMatchObject({ owner: "owner", repo: "repo" });
expect(parseGitHubInput("https://github.com/owner/repo/tree/main/path/to/skill")).toMatchObject({ owner: "owner", repo: "repo", branch: "main", skillPath: "path/to/skill" });
```

Also test preview returns one candidate, multiple candidates, rejects no `SKILL.md`, and install rejects existing target directory.

- [ ] **Step 2: Run red**

Run: `npm test -- src/server/__tests__/githubImport.test.ts`

Expected: FAIL because `githubImport.ts` does not exist.

- [ ] **Step 3: Implement GitHub import module**

Implement parser, clone with `git clone --depth 1`, local file scanning, safe path checks, recursive directory copy, target name sanitization, and cleanup warning handling.

- [ ] **Step 4: Add API tests**

Extend API tests for:

- `POST /api/import/github/preview`
- `POST /api/import/github/install`

Use injected `githubImportOptions` so tests clone from local repositories instead of the network.

- [ ] **Step 5: Implement API endpoints**

Add Express routes for preview and install.

- [ ] **Step 6: Run green**

Run: `npm test -- src/server/__tests__/githubImport.test.ts src/server/__tests__/api.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/server/githubImport.ts src/server/paths.ts src/server/index.ts src/server/__tests__/githubImport.test.ts src/server/__tests__/api.test.ts src/shared/types.ts
git commit -m "feat: add GitHub skill install API"
```

---

### Task 3: Chinese-First Dashboard UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `skill.summary`, `/api/import/github/preview`, `/api/import/github/install`
- Produces: Chinese-first skill detail view and GitHub install workflow.

- [ ] **Step 1: Write failing UI tests**

Add tests that assert:

- detail panel shows `这个技能能做什么` and Chinese summary before raw `SKILL.md`
- saving display name/category/summary calls `PATCH /api/config`
- entering a GitHub URL and clicking preview shows candidates
- installing a single candidate calls `/api/import/github/install` and refreshes skills

- [ ] **Step 2: Run red**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because UI does not show Chinese summaries or GitHub controls.

- [ ] **Step 3: Implement UI changes**

Add editable display name, summary, category fields. Show Chinese cards above raw markdown. Add GitHub install section with preview, candidate selection, install, and readable status messages.

- [ ] **Step 4: Style UI**

Keep compact operational layout. Make raw markdown secondary with a clear heading and max-height.

- [ ] **Step 5: Run green**

Run: `npm test -- src/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/App.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add Chinese-first dashboard UI"
```

---

### Task 4: Verification And Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces documented local and GitHub install usage.

- [ ] **Step 1: Update README**

Document Chinese-first summaries and GitHub install support for public repositories.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected: both PASS.

- [ ] **Step 3: Verify local API**

Run:

```bash
curl -s http://localhost:5173/api/skills | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);console.log(j.skills[0].summary)})'
```

Expected: first skill has Chinese summary fields.

- [ ] **Step 4: Commit**

Run:

```bash
git add README.md
git commit -m "docs: document Chinese summaries and GitHub install"
```

