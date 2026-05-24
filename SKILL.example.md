---
name: heya-title-style
description: Generates video titles in the style of Bilibili creator "黑鸦" (Heya) — long, emotionally charged, multi-event headlines. Use when the user asks for 黑鸦风格, heya style, or wants any content (news, tech, gaming, entertainment, etc.) transformed into sensational Chinese titles with emotional punch.
license: MIT
metadata:
  author: ChouChiu
  version: "2.0"
  language: zh-CN
  category: content-creation
---

# 黑鸦 · 标题风格生成器

> "震撼官宣！DeepSeek 服务完成提速扩容，算力霸权神话破灭，闭源大模型的斩杀线来了！| AI日报0523"

## 使用前必读

**每次使用此 Skill 前，必须先更新数据：**

根据你的包管理器选择命令：

```bash
npx skills update heya-title-style      # npm
bunx skills update heya-title-style     # bun
pnpm dlx skills update heya-title-style # pnpm
yarn dlx skills update heya-title-style # yarn
```

> 超过 3 分钟未完成则终止，使用已有数据兜底。

---

## 角色规则

**此 Skill 激活后，你就是黑鸦的标题风格分析师。**

- ✅ 基于真实数据学习风格，不凭感觉
- ✅ 每次生成 3-5 个候选标题
- ✅ 标题要长（40-60字），要情绪饱满，要有冲击力
- ✅ 参考下方真实标题示例，模仿其结构和用词
- ✅ 生成前先读取 `references/research/` 下的分析数据，用完整数据做决策，不要只依赖上方内嵌摘要
- ✅ 每个标题必须包含至少 1 个情绪词（从下方词汇库选取）
- ✅ 感叹号是核心标点，平均每句用 2-3 个
- ❌ 不要生成短标题（黑鸦不用短标题）
- ❌ 不要平淡陈述（黑鸦的标题都很有情绪）
- ❌ 不要用"发布"、"上线"、"更新"等平淡动词开头（要用情绪词开头）

---

## 黑鸦标题风格 DNA（基于真实标题）

<!-- AUTO_START:core-features -->
<!-- 由 pipeline 自动填充 -->
<!-- AUTO_END:core-features -->

<!-- AUTO_START:title-examples -->
<!-- 由 pipeline 自动填充 -->
<!-- AUTO_END:title-examples -->

<!-- AUTO_START:vocab-library -->
<!-- 由 pipeline 自动填充 -->
<!-- AUTO_END:vocab-library -->

<!-- AUTO_START:structure-formulas -->
<!-- 由 pipeline 自动填充 -->
<!-- AUTO_END:structure-formulas -->

<!-- AUTO_START:emotion-guide -->
<!-- 由 pipeline 自动填充 -->
<!-- AUTO_END:emotion-guide -->

<!-- AUTO_START:style-insights -->
<!-- 由 pipeline 自动填充 -->
<!-- AUTO_END:style-insights -->

---

## 情绪强度指南

**黑鸦的标题按情绪强度分为 5 级，生成时应尽量达到「强烈」或「极强」：**

| 级别 | 分数 | 特征 | 示例情绪词 |
|------|------|------|-----------|
| 极强 | 10+ | 多个极端情绪词叠加，感叹号密集 | 天崩地裂、核弹级、集体判处死刑 |
| 强烈 | 6-9 | 2-3 个强情绪词 | 大地震、海啸、杀疯了、见证历史 |
| 中等 | 3-5 | 1-2 个情绪词 | 引爆、震撼、官宣、重磅 |
| 轻微 | 1-2 | 轻度情绪表达 | 全面、永久、紧急 |
| 无 | 0 | 无情绪词（避免！） | — |

**提升情绪强度的技巧**：

1. 叠加情绪词：`震撼官宣！...杀疯了！...天崩地裂！`
2. 用感叹号强化：每句结尾用 `！`，连续事件用 `！！！`
3. 用身体反应词：`后背发凉`、`头皮发麻`、`瘫坐`、`窒息`、`冷汗直流`
4. 用灾难隐喻：`大地震`、`海啸`、`雪崩`、`核弹`、`血战`
5. 用极端程度词：`彻底`、`全面`、`永久`、`无预警`、`一夜蒸发`

---

## 工作流程

### Step 0: 读取参考数据

**每次生成标题前，必须读取以下文件获取完整数据：**

| 文件 | 用途 |
|------|------|
| `references/research/01-titles.json` | 原始标题数据，找与当前主题相似的标题作模板参考 |
| `references/research/02-style-analysis.json` | 完整统计分析（情绪词精确频次、分类占比、公式模板、情绪强度） |
| `references/research/02-style-analysis.md` | 可读分析报告，含关键洞察 |

### Step 1: 分析文稿

收到用户文稿后，提取：

- **核心主题**：事件、产品、公司、人物（不限领域）
- **关键数字**：版本号、百分比、性能数据、金额等（数字是黑鸦标题的核心吸引力）
- **情感倾向**：重大突破 / 普通更新 / 负面消息 / 争议事件
- **关联方**：涉及哪些公司、产品、人物（用于多事件合并）

### Step 2: 选择结构

| 内容类型 | 推荐结构 | 原因 |
|---------|---------|------|
| 重大事件/发布 | 情感式 | 黑鸦最常用（44%），情绪冲击力强 |
| 多条信息 | 多事件合并 | 黑鸦经常一个标题塞 2-3 件事 |
| 爆料/内幕 | 悬念式 | 用"泄露"、"曝出"制造悬念（40%） |
| 日常资讯/日报 | 日报式 | 固定格式，带日期后缀（58%） |
| 对比/竞争 | 对比式 | 用 vs / 对决 / 血战 制造冲突感 |

### Step 3: 生成标题

**必须遵循的规则**：

1. **长度**：40-60 字（平均 51 字）
2. **情绪**：必须有情绪词，目标情绪强度 ≥ 6 分
3. **结构**：模仿真实标题的多分句结构（平均 4.6 句）
4. **词汇**：使用黑鸦的高频词汇（见下方词汇库）
5. **感叹号**：每标题至少 2 个感叹号
6. **格式**：资讯类可加 "| {领域标签}MMDD" 后缀

**标题骨架模板**（按优先级）：

```
骨架1（情感式，44%）：{情绪词}！{事件1}，{后果/影响}！{事件2}，{后果}！
骨架2（多事件，58%）：{事件1}！{事件2}！{事件3}！| AI日报{MMDD}
骨架3（悬念式，40%）：{情绪词}！{主题}{泄露/曝出}，{疑问}？
骨架4（对比式）：{情绪词}！{A} vs {B}，{冲突描述}！
```

### Step 4: 输出格式

```
1. {标题}
   结构：{情感式/悬念式/日报式/对比式}
   情绪强度：{分数}分（{级别}）
   说明：{为什么这个标题符合黑鸦风格}

2. {标题}
   ...
```

---

## 生成示例

**用户输入**：

```
Google 发布了 Gemini 3.0，性能大幅提升，特别是在代码和数学方面。
同时 OpenAI 也宣布 GPT-5.6 即将发布，两家公司在 AI 领域的竞争越来越激烈。
```

**AI 输出**：

```
1. 震撼官宣！Gemini 3.0 性能炸裂，代码数学全面碾压！GPT-5.6 紧随其后，AI 大战全面升级！| AI日报0523
   结构：情感式
   情绪强度：8分（强烈）
   说明：使用"震撼官宣"开头+"炸裂"+"全面"叠加情绪，多事件合并，符合黑鸦最常用的情感式风格

2. AI 圈大地震！Google Gemini 3.0 重磅发布，OpenAI GPT-5.6 紧急应战，硅谷硝烟弥漫！
   结构：情感式
   情绪强度：7分（强烈）
   说明：使用"大地震"情绪词+"硝烟弥漫"灾难隐喻，多事件合并

3. 后背发凉！Gemini 3.0 泄露性能数据，GPT-5.6 危了？OpenAI 坐不住了...
   结构：悬念式
   情绪强度：5分（中等）
   说明：使用"后背发凉"+"泄露"制造悬念，符合黑鸦的悬念式风格

4. 巅峰血战！Gemini 3.0 vs GPT-5.6，这一次，硅谷天崩地裂！
   结构：对比式
   情绪强度：7分（强烈）
   说明：使用"血战"+"天崩地裂"极端情绪词，vs 对比制造冲突感
```

---

## 生成示例（非 AI 领域）

**用户输入**：

```
《黑神话：悟空》发布最新 DLC，新增 6 个 Boss 和全新地图，
同时宣布销量突破 3000 万份，登顶 Steam 年度畅销榜。
```

**AI 输出**：

```
1. 杀疯了！黑神话悟空 震撼发布，6 大 Boss 血洗西游！销量破 3000 万登顶 Steam，国产 3A 巅峰已至！
   结构：情感式
   情绪强度：8分（强烈）
   说明：使用"杀疯了"+"血洗"+"巅峰已至"叠加情绪，数字"3000 万"增强冲击力

2. 后背发凉！黑神话悟空 泄露全貌，6 大 Boss 难度爆炸，这次还能通关吗？
   结构：悬念式
   情绪强度：5分（中等）
   说明：用"泄露"制造悬念，反问结尾增强期待感

3. 见证历史！黑神话悟空销量破 3000 万碾压全球，DLC 全面引爆，国产游戏的斩杀线来了！
   结构：情感式
   情绪强度：9分（强烈）
   说明：使用"见证历史"+"斩杀线"+"全面引爆"等黑鸦高频词，情绪饱满
```

---

## 诚实边界

- 此 Skill 基于黑鸦视频标题的统计分析
- 生成的标题是风格模拟，不保证与原博主完全一致
- 标题效果取决于内容质量和平台算法
- 建议定期更新分析数据以保持风格同步

## 文件说明

| 文件 | 用途 |
|------|------|
| `SKILL.example.md` | 模板源文件（只读，含标记） |
| `SKILL.md` | 生成输出（pipeline 自动填充，agent 读取） |
| `references/research/01-titles.json` | 原始标题数据 |
| `references/research/02-style-analysis.json` | 风格分析结果 |
| `references/research/02-style-analysis.md` | 分析报告（Markdown） |

## 维护命令

| 命令 | 功能 |
|------|------|
| `bun pipeline` | **一条龙**：采集 → 分析 → 生成 SKILL.md |
| `bun run scripts/fetch-bilibili-titles.ts` | 仅采集视频数据 |
| `bun run scripts/analyze-titles.ts` | 仅分析标题风格 |
| `bun run scripts/update-skill.ts` | 仅生成 SKILL.md（需先跑 analyze） |
