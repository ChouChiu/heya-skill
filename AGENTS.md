# AGENTS.md

## Quick Reference

**Runtime:** Bun ≥ 1.0 (not Node/npm — use `bun` for all commands)
**Language:** TypeScript (ESM, `"type": "module"`)
**Lint/Format:** Biome (not ESLint/Prettier)
**Package manager:** Bun (`bun.lock`, `bun install`)

## Commands

```bash
bun install                  # install dependencies
bun pipeline                 # full pipeline: fetch → analyze → generate SKILL.md
bun pipeline --skip-fetch    # skip UAPI fetch, analyze + generate only
bun pipeline --skip-analyze  # regenerate SKILL.md from existing analysis
bun pipeline --dry-run       # preview steps without executing
bun run lint                 # Biome check on scripts/
bun run format               # Biome auto-fix on scripts/ + website/src/
bun run check                # Biome check on scripts/ + website/src/
bun run website:dev          # Astro dev server
bun run website:build        # Astro build
bun run website:preview      # Astro preview
```

There are **no tests** in this repo. No `test` script exists.

## Architecture

Two independent sub-projects in one repo:

| Area | Path | Framework | Entry |
|------|------|-----------|-------|
| Pipeline scripts | `scripts/` | Bun + TypeScript | `scripts/pipeline.ts` |
| Landing page | `website/` | Astro + Tailwind CSS | `website/src/` |

### Pipeline (`scripts/`)

Three-step pipeline orchestrated by `scripts/pipeline.ts`:

1. **fetch** (`fetch-bilibili-titles.ts`) — UAPI (uapis.cn), fetches video titles
2. **analyze** (`analyze-titles.ts`) — NLP analysis (jieba-wasm, natural, sentiment, compromise)
3. **update** (`update-skill.ts`) — injects analysis into SKILL.example.md → produces SKILL.md

Shared modules live in `scripts/lib/` (types, UAPI client, analysis engine, generators).

### Website (`website/`)

Astro 6 static site deployed to GitHub Pages at `https://chouchiu.github.io/heya.skill/`. Config in `astro.config.mts` sets `srcDir: ./website/src`, `outDir: ./website/dist`.

## Critical File Distinction

- **`SKILL.example.md`** — template source, manually edited, contains `<!-- AUTO_START:... -->` / `<!-- AUTO_END:... -->` markers
- **`SKILL.md`** — auto-generated output, consumed by AI agents. **Never edit SKILL.md directly** — it gets overwritten by `bun pipeline`

## Code Style (Biome)

- 2-space indent, double quotes for JS/TS
- Linter: recommended rules, `useLiteralKeys` off
- Astro files: `useConst`, `useImportType`, `noUnusedVariables`, `noUnusedImports` disabled
- CSS files: formatter/linter/assist all disabled
- Organize imports: enabled

## Environment

UAPI API key in `.env` (optional, uses free guest quota if not set):

```bash
UAPI_API_KEY=          # optional, for higher rate limits
```

## CI (GitHub Actions)

- **`update-reference.yml`** — daily cron (UTC 12:30 / Beijing 20:30), runs `bun pipeline`, commits `references/` + `SKILL.md` changes. No secrets required.
- **`deploy-website.yml`** — on push to `website/**`, `astro.config.mts`, `package.json`, or `bun.lock`. Builds and deploys to GitHub Pages.

## Commit Convention

Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`, `ci:`, `revert:`.

## Data Files

`references/research/` contains auto-generated analysis data (committed to repo):
- `01-titles.json` — raw video titles
- `02-style-analysis.json` — structured analysis
- `02-style-analysis.md` — human-readable report

These are overwritten by CI daily. Do not manually edit.
