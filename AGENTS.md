# AGENTS.md

Bilibili creator "黑鸦" title style generator — CLI pipeline + AI skill output.

## Runtime

- **Bun only**. Every command uses `bun`. No npm/pnpm/yarn.
- `bun run <script>` for package.json scripts, `bun test` for tests.
- `#!/usr/bin/env bun` shebang on `src/index.ts`.

## Commands

```sh
bun install                    # install deps (bun.lock)
bun run check                  # biome check . && tsc --noEmit
bun run format                 # biome check --write .
bun test                       # run all tests
bun test -t <pattern>          # filter by test name regex
bun run pipeline               # full pipeline: fetch → analyze → generate
bun run pipeline --skip-fetch --skip-analyze --dry-run
bun run docs                   # typedoc → docs/ (gitignored)
```

**Order matters**: `bun run check` before `bun test`. CI enforces this.

## Pipeline

3 phases: fetch (UApi Bilibili proxy) → analyze (HanLP REST + deterministic aggregation) → generate (template substitution).

Fetch uses `uapi-sdk-typescript` — no Bilibili cookie or WBI signing needed. HanLP REST required for analysis; skip with `--skip-analyze`.

## SKILL.md generation

- **Template**: `SKILL.template.md` — the canonical source. Edit this file.
- **Output**: `skills/heya-title-style/SKILL.md` — auto-generated from template + analysis, committed. This is the deployed agent skill artifact.
- **AUTO sections**: Content between `<!-- AUTO_START:xxx -->` / `<!-- AUTO_END:xxx -->` is replaced by pipeline for these 4 sections: `core-features`, `title-examples`, `vocab-library`, `structure-formulas`. The `core-guidance` section has template fallback text but is NOT replaced by pipeline. Never edit AUTO sections in the output file.
- **Reference data**: `skills/heya-title-style/references/` is auto-generated.
  - `00-llm-brief.md` — compact LLM-readable summary
  - `01-titles.csv` — raw video titles
  - `02-style-analysis.yaml` — structured analysis data
  - `02-style-analysis.md` — human-readable analysis report
  - `03-title-features.json` — per-title debug data; never load wholesale into LLM context

## Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `UAPI_BASE_URL` | no | `https://uapis.cn` | UApi proxy base URL |
| `UAPI_API_KEY` | no | — | UApi API key (free tier works without) |
| `BILIBILI_MID` | no | `3706929260006322` | Target user ID (黑鸦) |
| `BILIBILI_PAGE_SIZE` | no | `30` | Archive API page size |
| `NLP_BACKEND` | no | `hanlp` | Only `hanlp` is supported |
| `HANLP_URL` | yes (unless `--skip-analyze`) | `http://127.0.0.1:8765` | Local HanLP REST service |
| `HANLP_TIMEOUT_MS` | no | `20000` | Per-request timeout (ms) |
| `HANLP_BATCH_SIZE` | no | `32` | Titles per HanLP parse call |

Copy `.env.example` to `.env` (gitignored), and start a local HanLP REST service before running analysis. Pipeline performs `/health` check and fails clearly if HanLP unavailable.

## Lint / format

- **Biome** (v2.5+), not ESLint/Prettier.
- Excludes: `skills/` (see `biome.json`).
- Double quotes, tab indent, organize imports on save (`assist.source.organizeImports: "on"`).

## TypeScript

- `strict: true`, `noEmit: true`, `target: ES2023`, `moduleResolution: Bundler`.
- Notable: `noUncheckedIndexedAccess: true`, `allowImportingTsExtensions: true`, `skipLibCheck: true`.
- TypeScript 6.x with `bun-types` for Bun globals.

## Testing

- **`bun:test`** (Bun built-in). No Vitest/Jest config.
- Integration tests use static fixture data — no network, no HanLP needed.
- 4 test files: `nlp-adapter`, `pipeline.integration`, `skill-generation`, `video-titles`.

## Architecture

```
src/index.ts                 CLI entry (bun shebang)
src/shared/                  env, files (CSV/JSON/YAML), paths, sleep
src/features/
  video-titles/              UApi proxy pagination → VideoEntry[]
  style-analysis/            HanLP adapter + style aggregation + report rendering
  skill-generation/          Template → SKILL.md with AUTO section replacement
  pipeline/                  Orchestration + CLI option parsing
tests/                       4 test files (bun:test)
```

- Fetch: `uapi-sdk-typescript` (`UapiClient`) proxies Bilibili API. No WBI signing needed.
- NLP: local HanLP REST for segmentation, POS, and NER. Aggregation and style scoring remain deterministic.
- File I/O: custom CSV/YAML/JSON helpers in `src/shared/files.ts` (auto-create parent dirs).

## CI

Scheduled daily (`30 12 * * *`) + manual dispatch via `.github/workflows/update-reference.yml`.
Runs: install → check → test → HanLP health check → pipeline → commit if `skills/heya-title-style/references/` changed.
Note: CI pushes reference data only; SKILL.md is regenerated but commits require manual review.

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.
Scopes: `video-titles`, `style-analysis`, `skill-generation`, `pipeline`, `readme`.
