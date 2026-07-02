# Codex Skills Dashboard Design

## Goal

Build a local web tool that shows all Codex skills installed on this Mac, lets the user inspect what each skill can do, and supports lightweight management such as refresh, notes, categories, hidden skills, extra scan paths, and simple skill installation/import.

The first version should be genuinely useful locally without becoming a full marketplace.

## Scope

The dashboard will run from `/Volumes/Data/Code/Skills` as a local web app.

It will automatically scan:

- `/Users/cresjq/.codex/skills`
- `/Users/cresjq/.codex/plugins/cache`

It will read `SKILL.md` files, parse the frontmatter when present, and expose both the parsed metadata and full skill instructions.

It will also keep a project-local configuration file for manual changes, including:

- extra scan directories
- user notes
- display category
- hidden status
- custom entries that point to local paths

## User Experience

The first screen is the actual management dashboard.

The layout has:

- a compact left sidebar for searching and filtering skills
- a main details area for the selected skill
- a management panel for local edits and import actions

The list view shows each skill's name, short description, source type, and whether it has a user note or local override.

Clicking a skill opens details with:

- skill name
- description
- source type
- absolute path
- plugin/source folder when known
- parsed metadata
- full `SKILL.md` content
- user note and category controls

There will be a refresh button that rescans the filesystem so newly installed Codex skills appear without changing code.

## Skill Sources

Source detection will be conservative:

- `~/.codex/skills/*/SKILL.md`: local, personal, or system skill
- `~/.codex/plugins/cache/**/skills/*/SKILL.md`: plugin skill
- configured extra directories: custom source

If the same skill name appears in multiple places, the dashboard will show all copies and label their source paths. It will not silently merge them.

## Manual Editing

Manual edits are stored in `data/skills-config.json`.

The dashboard can update:

- extra scan paths
- per-skill note
- per-skill category
- hidden/unhidden state
- custom skill entries

Manual edits do not modify the original `SKILL.md` files in the first version. This keeps the tool safe and reversible.

## Installation And Import

The first version supports two install/import paths:

- register an existing local skill directory as a custom source
- import a skill from a local directory into the configured Codex skills folder

GitHub install is not implemented in the first version. The UI can reserve a disabled or informational area for future GitHub installation, but it must not run remote commands or clone repositories.

## Architecture

Use a small local Node app:

- Vite + React for the browser UI
- Express or a Vite-compatible Node server for local filesystem APIs
- project-local JSON config for manual overrides

The browser never reads the filesystem directly. It calls local API endpoints served by the app.

Core modules:

- scanner: finds `SKILL.md` files and parses metadata
- config store: reads and writes `data/skills-config.json`
- API server: exposes scan, details, config, and import endpoints
- UI: list, filters, detail view, and management controls

## API Shape

Expected endpoints:

- `GET /api/skills`: scan configured sources and return normalized skill records
- `GET /api/skills/:id`: return a selected skill with full markdown content
- `GET /api/config`: return manual config
- `PATCH /api/config`: update notes, categories, hidden state, and scan paths
- `POST /api/import/local`: import or register a local skill directory

Skill IDs should be stable across refreshes and derived from source path plus skill name.

## Error Handling

The app should surface readable errors in the UI:

- missing directory
- invalid `SKILL.md`
- unreadable file
- config write failure
- duplicate skill name
- import path is not a valid skill directory

Partial failures should not block the whole dashboard. If one skill cannot be read, the rest should still load.

## Testing And Verification

Verification should include:

- scanner finds skills in both default Codex paths
- parser handles frontmatter and plain markdown
- config writes and reloads manual edits
- hidden skills and filters behave correctly
- local import rejects invalid directories
- app runs locally and the dashboard renders with real installed skills

Manual browser verification should confirm:

- the list shows the current machine's Codex skills
- clicking a skill shows the full `SKILL.md`
- refresh detects filesystem changes
- notes/categories persist after reload

## Out Of Scope For First Version

- publishing skills
- enabling or disabling skills inside Codex runtime
- editing original `SKILL.md` files directly
- full remote marketplace browsing
- GitHub install
- automatic background sync
- destructive uninstall
