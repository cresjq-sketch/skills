# Source-Aware Skill Summaries Design

## Goal

Make each skill's Chinese summary feel specific to that skill instead of repeating a broad category template.

## Problem

The current dashboard derives `这个技能能做什么` and `什么时候会用到` mostly from category-level keyword rules. Skills in the same category therefore show similar text. For example, `agent-reach` is categorized as code collaboration, but its actual `SKILL.md` says it is an internet research and platform routing skill.

## Design

Keep the existing category system, but make summary content source-aware.

The summary generator should read these parts of `SKILL.md`:

- frontmatter `description`
- `triggers`
- lines containing `Use when`
- lines containing `MUST USE when`
- lines containing `NOT for`
- nearby capability lists, platform names, and routing keywords

The detail panel should show:

- `这个技能能做什么`: a concrete Chinese summary derived from source text
- `什么时候会用到`: source-derived trigger hints
- `使用边界`: source-derived exclusions or limits when available
- `中文分类`: existing category label

Manual overrides still win over generated content.

## Extraction Rules

The first version remains deterministic and offline. No LLM calls.

Rules:

- If `description` has enough content, derive the main summary from it.
- If text says `MUST USE when`, convert that into trigger hints.
- If text says `NOT for`, convert that into usage boundaries.
- If platform names appear, mention the platform group in the summary.
- If no source-specific content is found, keep the existing category fallback.

For `agent-reach`, generated output should mention internet research/platform routing rather than generic code collaboration.

## Testing

Tests should cover:

- `agent-reach` style markdown produces specific internet/platform summary
- `MUST USE when` produces trigger hints
- `NOT for` produces usage boundaries
- manual summary/category/display overrides still win
- existing category fallback still works for sparse skills
- UI renders the new `使用边界` card when boundaries exist

## Out Of Scope

- LLM translation
- perfect Chinese paraphrasing for every skill
- editing original `SKILL.md`
- changing GitHub installation behavior

