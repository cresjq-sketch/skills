# Chinese Skill Details And GitHub Install Design

## Goal

Improve the Codex Skills Dashboard so the user can understand skills at a glance in Chinese, while still preserving the original `SKILL.md`, and add safe installation from public GitHub repositories.

## Problems

The current dashboard exposes raw skill names, descriptions, and `SKILL.md` content. Many installed skills are written in English, so the user cannot quickly tell what a skill does.

The current installer only accepts a local directory that already contains `SKILL.md`. It cannot install a skill from a GitHub repository URL.

## User Experience

The dashboard should default to a Chinese-first reading experience.

Skill list rows show:

- original skill name
- Chinese category label
- Chinese capability summary
- source type
- user note marker

The detail panel shows a summary-first layout:

- `这个技能能做什么`: a short Chinese capability summary
- `什么时候会用到`: Chinese trigger hints derived from description, triggers, and markdown keywords
- `来源`: Codex, plugin, custom, or GitHub import
- editable Chinese display name, category, and notes
- collapsible or secondary raw `SKILL.md` area for exact source text

Manual Chinese fields are stored in the existing local config and survive refreshes.

## Chinese Summary Generation

The first version uses deterministic local heuristics, not an LLM call.

It derives Chinese summaries from:

- `description`
- `triggers`
- `name`
- common keywords in `SKILL.md`
- source path

It maps known keyword groups to Chinese labels:

- research, search, web, browser, crawl -> `搜索调研`
- paper, academic, citation, review -> `学术写作`
- docx, document, pdf, spreadsheet, presentation -> `文档办公`
- git, github, code, repo -> `代码协作`
- image, design, canva -> `图像设计`
- automation, reminder, monitor -> `自动化`
- chrome, browser, computer -> `浏览器/电脑控制`
- skill, plugin, template -> `技能/插件管理`

If no useful keyword is found, the fallback label is `通用技能`, and the summary says `查看原文了解这个技能的具体用途。`

The user can override the generated Chinese display name, category, and summary in the UI.

## GitHub Install

Add a GitHub install panel that accepts:

- `https://github.com/owner/repo`
- `owner/repo`
- `https://github.com/owner/repo/tree/branch/path/to/skill`

The server validates the input and uses `git clone --depth 1` for public repositories.

Install flow:

1. User enters a GitHub URL or `owner/repo`.
2. Server clones the repository into a temporary project-local install workspace.
3. Server scans for directories containing `SKILL.md`.
4. If one skill is found, install it automatically.
5. If multiple skills are found, return the candidate list and let the user choose.
6. Installing copies the selected skill directory into `/Users/cresjq/.codex/skills/<safe-skill-name>`.
7. If the target directory already exists, the server rejects the install.
8. After install, the UI refreshes the skill list.

GitHub installation is limited to public repositories in this version.

## Safety

The server must not execute code from the cloned repository.

The server only:

- runs `git clone`
- reads files
- copies selected directories

It must reject:

- unsupported URL formats
- repositories with no `SKILL.md`
- invalid selected skill paths outside the cloned repository
- installs that would overwrite an existing local skill directory

Temporary clone directories are deleted after install or failure. If cleanup fails, the server returns the install result plus a cleanup warning.

## API Changes

Add endpoints:

- `POST /api/import/github/preview`: clone or inspect the repository and return skill candidates
- `POST /api/import/github/install`: install one selected candidate into the Codex skills directory

The preview response includes:

- repository label
- candidate id
- candidate name
- candidate description
- candidate relative path
- whether exactly one candidate can be installed directly

The install response returns:

- installed path
- installed skill name
- updated config or a refresh hint

## Testing

Tests should cover:

- Chinese heuristic summary generation
- manual Chinese overrides
- GitHub URL parsing
- GitHub preview with one skill
- GitHub preview with multiple skills
- rejecting repositories with no `SKILL.md`
- rejecting overwrite attempts
- UI display of Chinese summary before raw markdown
- UI GitHub install flow for one candidate and multiple candidates

## Out Of Scope

- private GitHub repository install
- executing repository install scripts
- updating already installed skills
- uninstalling skills
- LLM translation or summarization
- publishing skills to GitHub
