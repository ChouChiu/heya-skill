# REASONIX.md — heya.skill

## Stack
- **Runtime:** Bun (`#!/usr/bin/env bun` on all scripts; `bun.lock`)
- **Language:** TypeScript (`noEmit: true`, `strict: true`)
- **Deps:** `jieba-wasm` (Chinese word segmentation); `@biomejs/biome` (dev, linter/formatter)
- **Website:** Astro (`website/` is a separate Bun project with its own `package.json`)
- **Node built-ins:** `node:` protocol (`node:fs`, `node:path`, `node:child_process`)

## Layout
- `SKILL.md` — generated output (Agent Skills standard, agent reads this)
- `SKILL.example.md` — template with `<!-- AUTO_START/END -->` markers (hand-edit this)
- `scripts/` — pipeline entry points (thin wrappers, `--help` supported)
- `scripts/lib/` — shared: types, utils, bilibili API, analysis engine, SKILL.md generators
- `references/research/` — raw titles JSON, analysis JSON + MD (dual-format, same basename)
- `.github/workflows/` — daily 20:30 UTC+8 auto-update CI + website deploy on push to `website/`
- `website/` — Astro landing page (ignored by biome via `biome.json`)
- `.reasonix/` — auto-generated semantic index (do not edit)
- `.env` — Bilibili auth cookie (gitignored by `**/.env`)

## Commands
```bash
bun pipeline              # fetch → analyze → generate SKILL.md
bun pipeline --skip-fetch # analyze + generate only
bun pipeline --skip-analyze
bun pipeline --dry-run
bun run scripts/fetch-bilibili-titles.ts
bun run scripts/analyze-titles.ts --top 30
bun run scripts/update-skill.ts          # SKILL.example.md → SKILL.md
bun run lint                             # Biome check
bun run format                           # Biome auto-fix
bun website:dev                          # Astro dev server
bun website:build                        # Astro build
```

## Conventions
- Scripts have `#!/usr/bin/env bun` shebang; all `.ts`
- `import.meta.dir` for script directory resolution (Bun ESM native)
- Node builtins use `node:` protocol (`node:fs`, `node:path`, etc.) per Biome rule
- Analysis output dual-format: `.json` + `.md`, same basename in `references/research/`
- SKILL.md frontmatter (`name`, `description`) follows Agent Skills spec (agentskills.io)
- Chinese word segmentation uses `jieba-wasm` (`cut(text, true)` with HMM)
- Biome enforces double quotes + auto-organize imports (`biome.json`)

## Watch out for
- `.reasonix/` is auto-generated — never edit manually
- `fetch-bilibili-titles.ts` needs `BILI_COOKIE="SESSDATA=xxx"` in `.env`; see `.env.example`
- Edit `SKILL.example.md`, never the generated `SKILL.md`
- All scripts expect to be run from project root via `bun run`
- `import.meta.dir` is Bun-only; scripts won't run under plain Node
- `jieba-wasm` is a WASM module — works in Bun but requires `wasm` support
- `website/` is a separate Bun project; biome ignores it; GitHub linguist marks it vendored
- Website deploys to `chouchiu.github.io/heya.skill/` — Astro `base` must stay `/heya.skill`
