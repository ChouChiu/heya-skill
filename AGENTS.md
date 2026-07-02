# AGENTS.md

## Commands

```bash
bun install              # install deps
bun test                 # run all tests (bun:test)
bun test tests/<file>    # run single test file
bun run check            # biome lint/format + tsc --noEmit
bun run format           # biome check --write
bun pipeline             # full pipeline: fetch → analyze → generate SKILL.md
bun pipeline --skip-fetch    # use existing titles, run analysis + generation
bun pipeline --skip-analyze  # use existing analysis, run generation only
bun pipeline --dry-run       # print plan, do nothing

```

Always run `bun run check` before committing. Run `bun test` after changes.

## Environment

- `BILIBILI_COOKIE` — required for `bun pipeline` (fetch phase). Skipped with `--skip-fetch` or `--dry-run`.
- `BILIBILI_MID` — defaults to `3706929260006322`
- `BILIBILI_PAGE_SIZE` — defaults to `30`
- Copy `.env.example` → `.env` and fill in the cookie.

## Architecture

Feature-based structure under `src/features/`:

| Feature | Purpose |
|---|---|
| `bilibili-api/` | API client, Wbi signing, error handling |
| `video-titles/` | Archive pagination, title normalization |
| `style-analysis/` | Deterministic style statistics, report rendering |
| `skill-generation/` | SKILL.md rendering via template section replacement |
| `pipeline/` | CLI orchestration, option parsing |

Shared utilities in `src/shared/` — env helpers, file I/O, path constants.

Entrypoint: `src/index.ts` → `runPipeline()` in `src/features/pipeline/pipeline.ts`.

## Key patterns

- **Bun-only runtime.** Shebang is `#!/usr/bin/env bun`. Import resolution is Bun-native (supports `.ts` extensions, no `.js` needed). Do not use `node` or `tsx`.
- `SKILL.template.md` contains `<!-- AUTO_START:name -->` / `<!-- AUTO_END:name -->` section markers. The generator replaces content between markers. Never edit `SKILL.md` directly — it's auto-generated.
- Bilibili API response types are hand-maintained in `bilibili-api/types.ts`. Only 4 endpoints used; types are thin `BilibiliEnvelope<Record<string, unknown>>`.
- The Bilibili `x/space/wbi/arc/search` endpoint has a local narrow type (`types.ts`) because it's missing from BACNext OpenAPI.
- Tests use `bun:test` imports. Integration test (`pipeline.integration.test.ts`) uses fixture data, no network calls.
- `jieba-wasm` is the only Chinese word segmentation dependency. Used in style analysis. Do not replace.
- Biome excludes `src/generated` and `references` from linting.

## Gotchas

- The `.env` file is gitignored. Tests and `--skip-fetch`/`--dry-run` do not require it.
- `references/` contains generated analysis artifacts. Don't edit them manually — they're overwritten by the pipeline.
- `SKILL.md` is generated output. All edits go in `SKILL.template.md` or the generation code.
- Pipeline flags are parsed positionally: `--skip-fetch`, `--skip-analyze`, `--dry-run`, `--help`/`-h`.
- No PR CI checks exist. The only workflow (`.github/workflows/update-reference.yml`) runs on schedule + manual dispatch. All quality checks are local (`bun run check` + `bun test`).
- CI workflow references `bun run generate:api-types` but this script does not exist in `package.json`. The `src/generated/` directory (excluded from lint) is empty — it was likely intended for generated BACNext API types. CI will fail at that step until the script is added.
