# AGENTS.md

Bilibili creator "黑鸦" title style generator — CLI pipeline + AI skill output.

## Runtime

- **Bun only**. Every command uses `bun`. No npm/pnpm/yarn.
- `bun run <script>` for package.json scripts, `bun test` for tests.
- `#!/usr/bin/env bun` shebang on `src/index.ts`.

## Commands

```sh
bun install          # install deps (bun.lock)
bun run check        # biome check . && tsc --noEmit
bun run format       # biome check --write .
bun test             # bun:test (Bun's built-in test runner)
bun run pipeline     # full pipeline: fetch → analyze → generate
bun run pipeline --skip-fetch --skip-analyze --dry-run
bun run docs         # typedoc → docs/ (gitignored)
```

**Order matters**: `bun run check` before `bun test`. CI enforces this.

## SKILL.md generation

- **Template**: `SKILL.template.md` — the canonical source. Edit this file.
- **Output**: `skills/heya-title-style/SKILL.md` — auto-generated, but committed.
- **AUTO sections**: Content between `<!-- AUTO_START:xxx -->` / `<!-- AUTO_END:xxx -->` is replaced by pipeline. Never edit these sections in the output file.
- **Reference data**: `skills/heya-title-style/references/` is also auto-generated.

Pipeline phases: fetch (Bilibili API) → analyze (deterministic stats) → generate (template substitution).

## Environment

| Variable | Required | Default | Notes |
|---|---|---|---|
| `BILIBILI_COOKIE` | yes (skip with `--skip-fetch`) | — | Bilibili login cookie |
| `BILIBILI_MID` | no | `3706929260006322` | Target user ID (黑鸦) |
| `BILIBILI_PAGE_SIZE` | no | `30` | Archive API page size |

Copy `.env.example` to `.env` (gitignored) and fill in the cookie.

## Lint / format

- **Biome** (v2.5+), not ESLint/Prettier.
- Excludes: `skills/`, `src/generated` (see `biome.json`).
- Double quotes, 2-space indent, organize imports on save.

## TypeScript

- `strict: true`, `noEmit: true`, `target: ES2023`, `moduleResolution: Bundler`.
- `bun-types` for Bun globals.

## Testing

- **`bun:test`** (Bun built-in). No Vitest/Jest config.
- Integration tests use fixture `VideoEntry[]` — no network, no cookie needed.
- 5 test files: `bilibili-api`, `pipeline.integration`, `skill-generation`, `video-titles`, `wbi`.

## Architecture

```
src/index.ts                 CLI entry (bun shebang)
src/shared/                  env, files (CSV/JSON/YAML), paths, sleep
src/features/
  bilibili-api/              Bilibili HTTP client + Wbi signing
  video-titles/              Archive pagination → VideoEntry[]
  style-analysis/            Deterministic Chinese NLP stats engine
  skill-generation/          Template → SKILL.md with AUTO section replacement
  pipeline/                  Orchestration + CLI option parsing
tests/                       5 test files (bun:test)
```

- NLP: `jieba-wasm` for Chinese word segmentation. All analysis is deterministic (rule-based, no ML).
- Wbi signing: fixed 64-index permutation table + MD5 hash for Bilibili API auth.

## CI

Scheduled daily (`30 12 * * *`) + manual dispatch. Runs: install → check → test → pipeline → commit if `skills/` changed.
