# Source-Aware Skill Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate concrete Chinese skill summaries from each skill's own `SKILL.md`.

**Architecture:** Extend the server-side summary module to extract description, trigger, and boundary signals from markdown. Extend the shared summary type and UI to show usage boundaries.

**Tech Stack:** TypeScript, Vitest, React Testing Library.

## Global Constraints

- No LLM calls.
- Manual overrides win over generated content.
- Raw `SKILL.md` remains visible.
- GitHub install behavior is unchanged.

---

### Task 1: Source-Aware Summary Extraction

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/server/skillSummary.ts`
- Test: `src/server/__tests__/skillSummary.test.ts`

**Interfaces:**
- Produces: `SkillSummary.boundaries: string[]`
- Produces: source-aware `deriveSkillSummary(skill, override)`

- [ ] Write failing tests for agent-reach markdown, MUST USE triggers, NOT for boundaries, and fallback behavior.
- [ ] Run `npm test -- src/server/__tests__/skillSummary.test.ts` and confirm failure.
- [ ] Implement source-aware extraction.
- [ ] Run `npm test -- src/server/__tests__/skillSummary.test.ts` and confirm pass.
- [ ] Commit summary changes.

### Task 2: Boundary UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `skill.summary.boundaries`
- Produces: `使用边界` card in detail panel when boundaries exist.

- [ ] Write failing UI test for the boundary card.
- [ ] Run `npm test -- src/App.test.tsx` and confirm failure.
- [ ] Add the boundary card.
- [ ] Run `npm test -- src/App.test.tsx` and confirm pass.
- [ ] Commit UI changes.

### Task 3: Verification

**Files:**
- Modify only if verification finds issues.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Restart local dev server and verify `/api/skills` shows agent-reach-specific summary.

