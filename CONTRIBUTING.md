# 贡献指南

面向维护者和贡献者。普通用户请阅读 [README.md](README.md)。

## 环境准备

```sh
bun install
cp .env.example .env
```

编辑 `.env` 填入实际值。完整 pipeline 需要本地 HanLP REST 服务（默认 `http://127.0.0.1:8765`）；只改代码、文档或测试时不需要启动 HanLP。

## 代码架构

```
heya.skill/
├── src/
│   ├── index.ts                    CLI 入口（bun shebang）
│   ├── shared/
│   │   ├── env.ts                  环境变量加载
│   │   ├── files.ts                CSV / JSON / YAML 文件读写
│   │   ├── paths.ts                项目路径常量
│   │   └── sleep.ts                延时工具
│   ├── features/
│   │   ├── video-titles/
│   │   │   ├── fetch-video-titles.ts   通过 UApi 代理分页拉取 B 站标题
│   │   │   └── types.ts                视频条目类型定义
│   │   ├── style-analysis/
│   │   │   ├── nlp.ts                  HanLP REST 适配器（分词 / POS / NER）
│   │   │   ├── rules.ts                确定性风格评分规则
│   │   │   ├── analyze.ts              聚合分析流水线
│   │   │   ├── report.ts               生成分析报告（YAML / Markdown）
│   │   │   └── types.ts                分析类型定义
│   │   ├── skill-generation/
│   │   │   ├── template.ts             SKILL.template.md 加载与解析
│   │   │   ├── renderers.ts            AUTO 区块内容渲染
│   │   │   ├── generate-skill.ts       主生成逻辑：模板 + 分析 → SKILL.md
│   │   │   └── types.ts                生成类型定义
│   │   └── pipeline/
│   │       ├── pipeline.ts             编排三阶段（fetch → analyze → generate）
│   │       └── options.ts              CLI 参数解析
│   └── ...
├── tests/
│   ├── video-titles.test.ts
│   ├── nlp-adapter.test.ts
│   ├── skill-generation.test.ts
│   └── pipeline.integration.test.ts
├── skills/
│   └── heya-title-style/
│       ├── SKILL.md                   生成的 Agent Skill（已提交）
│       └── references/                生成数据（自动更新）
│           ├── 00-llm-brief.md
│           ├── 01-titles.csv
│           ├── 02-style-analysis.yaml
│           ├── 02-style-analysis.md
│           └── 03-title-features.json
├── SKILL.template.md                  Skill 模板（手动编辑入口）
├── package.json
├── tsconfig.json
├── biome.json
├── typedoc.json
└── .env.example
```

项目按功能垂直组织——围绕功能边界切分，不按技术层横切：
- 功能代码放在 `src/features/<feature-name>/`。
- 多处共用的工具放 `src/shared/`。
- 测试跟随功能补充到 `tests/`。

## 如何修改

| 你要改什么 | 从哪里下手 | 说明 |
|---|---|---|
| 生成的 Skill 内容 | `SKILL.template.md` | 模板是生成 SKILL.md 的源头 |
| 标题数据获取 | `src/features/video-titles/` | 从 B 站拉取视频标题 |
| 风格分析方法 | `src/features/style-analysis/` | NLP + 确定性风格评分 |
| 渲染模板逻辑 | `src/features/skill-generation/` | 模板解析与 AUTO 区块生成 |
| 流水线编排 | `src/features/pipeline/` | 串起三阶段 + CLI 参数 |

### 不要手动编辑生成文件

`skills/heya-title-style/SKILL.md` 的 AUTO 区块由 pipeline 自动替换。下面 4 类区块的内容在每次运行 pipeline 时会被覆盖：

- `core-features`
- `title-examples`
- `vocab-library`
- `structure-formulas`

区块格式：

```html
<!-- AUTO_START:core-features -->
...自动生成内容...
<!-- AUTO_END:core-features -->
```

AUTO 区块之外的内容来自 `SKILL.template.md`，可以手动编辑模板来修改。

`skills/heya-title-style/references/` 下的所有文件也由 pipeline 生成。其中 `03-title-features.json` 体积较大，仅用于 Debug，不要整文件复制到 prompt 或文档中。

## 开发流程

### 日常改动

```sh
# 修改代码后
bun run format       # 自动格式化
bun run check        # Lint + 类型检查
bun test             # 运行测试
bun test -t <关键字>  # 只跑匹配的测试
```

**必须按 `check → test` 顺序**，CI 也这样执行。

### 运行 Pipeline

Pipeline 分三阶段：**fetch**（获取 B 站标题）→ **analyze**（分析风格）→ **generate**（生成 SKILL.md 和参考资料）。

```sh
bun run pipeline                                        # 完整运行
bun run pipeline --skip-fetch                           # 跳过获取，只用已有数据
bun run pipeline --skip-analyze                         # 跳过分析，只用上次分析结果
bun run pipeline --skip-fetch --skip-analyze --dry-run  # 只验证生成流程
```

完整运行前，确保本地 HanLP REST 服务可用。Pipeline 启动时会对 `/health` 做检查，不可用会明确报错。

### 生成文档

```sh
bun run docs    # TypeDoc → docs/（已 gitignore）
```

## 提交信息

使用 [约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/)：

```
<type>(<scope>): <description>
```

| type | 用途 |
|---|---|
| `feat` | 新增功能 |
| `fix` | 修复错误 |
| `docs` | 仅改文档 |
| `test` | 新增或调整测试 |
| `refactor` | 不改变行为的代码整理 |
| `chore` | 维护类改动 |
| `ci` | CI 配置改动 |

scope 建议用功能名：`video-titles`、`style-analysis`、`skill-generation`、`pipeline`、`readme`。

示例：

```text
fix(video-titles): continue pagination after invalid records
docs(readme): simplify user-facing usage guide
test(style-analysis): cover repeated token offsets
```

如果有破坏性变更，在正文中写明 `BREAKING CHANGE:` 和迁移方式。

## Pull Request

提交 PR 前确认：

- [ ] 改动聚焦在一个功能或一个文档目标上，没有混入无关重构
- [ ] 已运行 `bun run check && bun test`
- [ ] 生成文件来自 pipeline，不是手动改 AUTO 区块
- [ ] 描述写清楚了：为什么改、改了什么、怎么验证
- [ ] README 仍然面向用户，维护细节放本文件或 `AGENTS.md`
