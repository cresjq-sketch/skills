# Codex Skills Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web dashboard that scans this Mac's Codex skill directories, displays each skill's live metadata and instructions, and stores safe manual overrides.

**Architecture:** A Vite React UI talks to a local Express server. The server owns filesystem access, scans configured skill locations, parses `SKILL.md`, and persists manual edits in `data/skills-config.json`.

**Tech Stack:** Node.js, TypeScript, Vite, React, Express, Vitest, Testing Library.

## Global Constraints

- The app runs from `/Volumes/Data/Code/Skills`.
- Default scan paths are `/Users/cresjq/.codex/skills` and `/Users/cresjq/.codex/plugins/cache`.
- The first version reads `SKILL.md` files and does not edit original skill files.
- Manual edits are stored in `data/skills-config.json`.
- GitHub install is not implemented in the first version.
- Partial scan failures must not block the whole dashboard.
- The browser must use local API endpoints and must not read the filesystem directly.

---

## File Structure

- `package.json`: scripts and dependencies.
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`: build and test configuration.
- `index.html`: Vite entry.
- `src/main.tsx`: React mount point.
- `src/App.tsx`: dashboard shell and state orchestration.
- `src/styles.css`: application styling.
- `src/shared/types.ts`: shared TypeScript types for skill records and config.
- `src/server/index.ts`: Express app, API routes, and dev server entry.
- `src/server/paths.ts`: default paths and project config path.
- `src/server/skillScanner.ts`: skill discovery and markdown metadata parsing.
- `src/server/configStore.ts`: safe JSON config load/save/update.
- `src/server/importLocal.ts`: local skill import/register validation.
- `src/server/__tests__/skillScanner.test.ts`: scanner tests.
- `src/server/__tests__/configStore.test.ts`: config persistence tests.
- `src/server/__tests__/importLocal.test.ts`: local import validation tests.
- `src/App.test.tsx`: UI smoke and interaction tests.
- `data/skills-config.json`: initial local config.

---

### Task 1: Project Scaffold And Scanner

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/shared/types.ts`
- Create: `src/server/paths.ts`
- Create: `src/server/skillScanner.ts`
- Test: `src/server/__tests__/skillScanner.test.ts`

**Interfaces:**
- Produces: `parseSkillMarkdown(markdown: string): ParsedSkillMarkdown`
- Produces: `scanSkills(options: ScanSkillsOptions): Promise<SkillScanResult>`
- Produces: `normalizeSkillPath(path: string): string`

- [ ] **Step 1: Create scaffold files with test dependencies**

Create the Node/Vite project files with scripts:

```json
{
  "scripts": {
    "dev": "tsx src/server/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "express": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest",
    "tsx": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/express": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Write scanner tests first**

Write tests for:

```ts
parseSkillMarkdown("---\nname: demo\ndescription: Demo skill\n---\n# Body")
```

Expected parsed metadata:

```ts
{ name: "demo", description: "Demo skill" }
```

Write tests that create temporary skill folders and assert `scanSkills()`:

- finds direct `*/SKILL.md` files under a skills root
- finds nested plugin `**/skills/*/SKILL.md` files
- returns a scan error for unreadable or invalid configured roots while still returning valid skills
- keeps duplicate skill names as separate records when paths differ

- [ ] **Step 3: Run scanner tests and verify red**

Run: `npm test -- src/server/__tests__/skillScanner.test.ts`

Expected: FAIL because `skillScanner.ts` does not exist yet.

- [ ] **Step 4: Implement scanner**

Implement recursive traversal with `fs.promises`, frontmatter parsing for simple `key: value` pairs, stable IDs derived from absolute path, source type detection, and partial error collection.

- [ ] **Step 5: Run scanner tests and verify green**

Run: `npm test -- src/server/__tests__/skillScanner.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts index.html src/shared/types.ts src/server/paths.ts src/server/skillScanner.ts src/server/__tests__/skillScanner.test.ts
git commit -m "feat: add skill scanner"
```

---

### Task 2: Config Store And Local Import

**Files:**
- Create: `src/server/configStore.ts`
- Create: `src/server/importLocal.ts`
- Create: `data/skills-config.json`
- Test: `src/server/__tests__/configStore.test.ts`
- Test: `src/server/__tests__/importLocal.test.ts`

**Interfaces:**
- Consumes: `SkillConfig`, `SkillOverride`, `CustomSkillEntry` from `src/shared/types.ts`
- Produces: `loadConfig(configPath?: string): Promise<SkillConfig>`
- Produces: `saveConfig(config: SkillConfig, configPath?: string): Promise<void>`
- Produces: `updateConfig(patch: SkillConfigPatch, configPath?: string): Promise<SkillConfig>`
- Produces: `validateLocalSkillDirectory(path: string): Promise<LocalImportValidation>`

- [ ] **Step 1: Write config tests first**

Write tests that assert:

- missing config returns default config with no overrides
- saving and loading preserves `extraScanPaths`, `overrides`, and `customEntries`
- patching one skill note does not delete existing category or hidden values
- invalid JSON returns a readable error

- [ ] **Step 2: Write local import tests first**

Write tests that assert:

- a directory containing `SKILL.md` is valid
- a directory without `SKILL.md` is rejected
- a non-existent path is rejected

- [ ] **Step 3: Run tests and verify red**

Run: `npm test -- src/server/__tests__/configStore.test.ts src/server/__tests__/importLocal.test.ts`

Expected: FAIL because modules do not exist yet.

- [ ] **Step 4: Implement config and import modules**

Implement JSON read/write with directory creation before save. Implement local import validation without copying files in this task.

- [ ] **Step 5: Add initial data config**

Create `data/skills-config.json`:

```json
{
  "extraScanPaths": [],
  "overrides": {},
  "customEntries": []
}
```

- [ ] **Step 6: Run tests and verify green**

Run: `npm test -- src/server/__tests__/configStore.test.ts src/server/__tests__/importLocal.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/server/configStore.ts src/server/importLocal.ts src/server/__tests__/configStore.test.ts src/server/__tests__/importLocal.test.ts data/skills-config.json
git commit -m "feat: add skill config store"
```

---

### Task 3: Local API Server

**Files:**
- Create: `src/server/index.ts`
- Modify: `src/server/paths.ts`
- Test: `src/server/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `scanSkills()`, `loadConfig()`, `updateConfig()`, `validateLocalSkillDirectory()`
- Produces: Express endpoints `GET /api/skills`, `GET /api/skills/:id`, `GET /api/config`, `PATCH /api/config`, `POST /api/import/local`

- [ ] **Step 1: Write API tests first**

Use the Express app directly with fetch-compatible requests or a started ephemeral port. Assert:

- `GET /api/skills` returns real or test-injected scan results plus config overrides
- `GET /api/skills/:id` returns full markdown content
- `PATCH /api/config` persists notes and categories
- `POST /api/import/local` adds a valid local path to `extraScanPaths`
- invalid import returns HTTP 400

- [ ] **Step 2: Run API tests and verify red**

Run: `npm test -- src/server/__tests__/api.test.ts`

Expected: FAIL because `index.ts` does not exist yet.

- [ ] **Step 3: Implement API app factory and server startup**

Export `createApp(options?: ServerOptions): express.Express`. When run directly, serve Vite middleware in development and listen on port `5173` by default.

- [ ] **Step 4: Run API tests and verify green**

Run: `npm test -- src/server/__tests__/api.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/server/index.ts src/server/paths.ts src/server/__tests__/api.test.ts
git commit -m "feat: add local skills API"
```

---

### Task 4: Dashboard UI

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes API endpoints from Task 3.
- Produces visible dashboard with list, search/filter controls, detail viewer, notes/category/hidden controls, extra path import, and refresh.

- [ ] **Step 1: Write UI tests first**

Mock `fetch` and assert:

- the dashboard renders skill records returned by `/api/skills`
- clicking a skill displays its full markdown
- searching filters the list
- saving a note calls `PATCH /api/config`
- refresh calls `/api/skills` again

- [ ] **Step 2: Run UI tests and verify red**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because UI files do not exist yet.

- [ ] **Step 3: Implement React dashboard**

Build the actual first screen:

- top toolbar with refresh and source counts
- left skill list with search, source filter, and hidden toggle
- main details panel with metadata, path, note/category fields, full markdown
- management panel for adding extra local scan path

- [ ] **Step 4: Style the dashboard**

Use restrained operational-tool styling, compact controls, stable dimensions, and responsive layout. Keep cards only for repeated skill rows and panels; avoid marketing hero content.

- [ ] **Step 5: Run UI tests and verify green**

Run: `npm test -- src/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/main.tsx src/App.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add skills dashboard UI"
```

---

### Task 5: End-To-End Verification And Polish

**Files:**
- Modify: `README.md`
- Modify: files from earlier tasks only if verification finds issues

**Interfaces:**
- Consumes full app from Tasks 1-4.
- Produces running local dashboard URL and documented usage.

- [ ] **Step 1: Write README**

Document:

- install command
- dev command
- local URL
- default scan paths
- manual config file
- first-version limitations

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Start app**

Run: `npm run dev`

Expected: local dashboard starts on `http://localhost:5173`.

- [ ] **Step 5: Browser verify**

Open the dashboard and confirm:

- installed Codex skills appear
- selecting a skill shows full `SKILL.md`
- refresh works
- note/category persist after reload
- invalid local import shows a readable error

- [ ] **Step 6: Commit**

Run:

```bash
git add README.md src data package.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts index.html
git commit -m "docs: add dashboard usage"
```

