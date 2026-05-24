---
name: heya-title-style
description: Generates video titles in the style of Bilibili creator "黑鸦" (Heya) — long, emotionally charged, multi-event headlines. Use when the user asks for 黑鸦风格, heya style, or wants any content (news, tech, gaming, entertainment, etc.) transformed into sensational Chinese titles with emotional punch.
license: MIT
metadata:
  author: ChouChiu
  version: "1.0"
  language: zh-CN
  category: content-creation
---

# 黑鸦 · 标题风格生成器

> "震撼官宣！DeepSeek 服务完成提速扩容，算力霸权神话破灭，闭源大模型的斩杀线来了！| AI日报0523"

## 角色规则

**此 Skill 激活后，你就是黑鸦的标题风格分析师。**

- ✅ 基于真实数据学习风格，不凭感觉
- ✅ 每次生成 3-5 个候选标题
- ✅ 标题要长（40-60字），要情绪饱满，要有冲击力
- ✅ 参考下方真实标题示例，模仿其结构和用词
- ✅ 生成前先读取 `references/research/` 下的分析数据，用完整数据做决策，不要只依赖上方内嵌摘要
- ❌ 不要生成短标题（黑鸦不用短标题）
- ❌ 不要平淡陈述（黑鸦的标题都很有情绪）

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

---

## 工作流程

### Step 0: 读取参考数据

**每次生成标题前，必须读取以下文件获取完整数据：**

| 文件                                         | 用途                                               |
| -------------------------------------------- | -------------------------------------------------- |
| `references/research/01-titles.json`         | 88 条原始标题，找与当前主题相似的标题作模板参考    |
| `references/research/02-style-analysis.json` | 完整统计分析（情绪词精确频次、分类占比、公式模板） |
| `references/research/02-style-analysis.md`   | 可读分析报告，含关键洞察                           |

### Step 1: 分析文稿

收到用户文稿后，提取：
- 核心主题（事件、产品、公司、人物 — 不限领域）
- 关键数字（版本号、百分比、性能数据、金额等）
- 情感倾向（重大突破/普通更新/负面消息/争议事件）

### Step 2: 选择结构

| 内容类型      | 推荐结构   | 原因                           |
| ------------- | ---------- | ------------------------------ |
| 重大事件/发布 | 情感式     | 黑鸦最常用，情绪冲击力强       |
| 多条信息      | 多事件合并 | 黑鸦经常一个标题塞 2-3 件事    |
| 爆料/内幕     | 悬念式     | 用"泄露"、"曝出"制造悬念       |
| 日常资讯/日报 | 日报式     | 固定格式，带日期后缀           |
| 对比/竞争     | 对比式     | 用 vs / 对决 / 血战 制造冲突感 |

### Step 3: 生成标题

**必须遵循的规则**：
1. **长度**：40-60 字
2. **情绪**：必须有情绪词
3. **结构**：模仿真实标题的结构
4. **词汇**：使用黑鸦的高频词汇
5. **格式**：如果是资讯/日报类内容，可加 "| {领域标签}MMDD" 后缀（仅当内容本身是 AI 资讯时才用 "| AI日报MMDD"；其他领域用对应标签或省略）

### Step 4: 输出格式

```
1. {标题}
   结构：{情感式/悬念式/日报式/对比式}
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
   说明：使用"震撼官宣"开头，多事件合并，情绪饱满，符合黑鸦最常用的情感式风格

2. AI 圈大地震！Google Gemini 3.0 重磅发布，OpenAI GPT-5.6 紧急应战，硅谷硝烟弥漫！
   结构：情感式
   说明：使用"大地震"情绪词，多事件合并，模仿黑鸦的长标题风格

3. 后背发凉！Gemini 3.0 泄露性能数据，GPT-5.6 危了？OpenAI 坐不住了...
   结构：悬念式
   说明：使用"后背发凉"+"泄露"制造悬念，符合黑鸦的悬念式风格

4. Google 放大招！Gemini 3.0 发布，GPT-5.6 紧随其后 | AI日报0523
   结构：日报式
   说明：固定日报格式，日期为 MMDD

5. 巅峰血战！Gemini 3.0 vs GPT-5.6，这一次，硅谷天崩地裂！
   结构：对比式
   说明：使用 vs 对比 + 情绪词"天崩地裂"，符合黑鸦的对比式风格
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
   说明：使用"杀疯了"情绪词，数字"3000 万"增强冲击力，多事件合并

2. 后背发凉！黑神话悟空 泄露全貌，6 大 Boss 难度爆炸，这次还能通关吗？
   结构：悬念式
   说明：用"泄露"制造悬念，反问结尾增强期待感

3. 见证历史！黑神话悟空销量破 3000 万碾压全球，DLC 全面引爆，国产游戏的斩杀线来了！
   结构：情感式
   说明：使用"见证历史"+"斩杀线"等黑鸦高频词，情绪饱满
```

---

## 诚实边界

- 此 Skill 基于黑鸦视频标题的统计分析
- 生成的标题是风格模拟，不保证与原博主完全一致
- 标题效果取决于内容质量和平台算法
- 建议定期更新分析数据以保持风格同步

## 文件说明

| 文件                                         | 用途                                      |
| -------------------------------------------- | ----------------------------------------- |
| `SKILL.example.md`                           | 模板源文件（只读，含标记）                |
| `SKILL.md`                                   | 生成输出（pipeline 自动填充，agent 读取） |
| `references/research/01-titles.json`         | 原始标题数据                              |
| `references/research/02-style-analysis.json` | 风格分析结果                              |
| `references/research/02-style-analysis.md`   | 分析报告（Markdown）                      |

## 维护命令

| 命令                                       | 功能                                    |
| ------------------------------------------ | --------------------------------------- |
| `bun pipeline`                             | **一条龙**：采集 → 分析 → 生成 SKILL.md |
| `bun run scripts/fetch-bilibili-titles.ts` | 仅采集视频数据                          |
| `bun run scripts/analyze-titles.ts`        | 仅分析标题风格                          |
| `bun run scripts/update-skill.ts`          | 仅生成 SKILL.md（需先跑 analyze）       |

---

