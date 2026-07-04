# 黑鸦标题风格生成器

[![License: MIT](https://img.shields.io/badge/License-MIT-red)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-Standard-orange)](https://agentskills.io)
[![skills.sh](https://img.shields.io/badge/skills.sh-Compatible-yellow)](https://www.skills.sh/chouchiu/heya-skill)
[![下载量](https://img.shields.io/badge/dynamic/json?url=https://skills.sh/api/badge/chouchiu/heya-skill&query=message&label=Downloads&labelColor=gray&color=green)](https://skills.sh/chouchiu/heya-skill)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)

把新闻、产品发布、争议事件、游戏资讯或合集素材，改写成 B 站创作者「黑鸦」风格的视频标题 — **长标题、强情绪、多事件合并、实体密集**。

## 安装与使用

```bash
bunx skills add ChouChiu/heya-skill
```

如果你的 AI 工具不支持自动安装，直接复制 [`skills/heya-title-style/SKILL.md`](skills/heya-title-style/SKILL.md) 内容到对话里也可使用。

安装后告诉 AI agent 你的需求，然后贴上素材：

```text
帮我把这段 AI 新闻写成黑鸦风格的标题
用黑鸦风格给这篇文章起 5 个标题，情绪强度从低到高
把下面几条新闻合成一个黑鸦式 AI 日报标题
```

## 适用场景

适合 AI、科技、商业、游戏、娱乐类内容：产品发布、模型更新、公司争议、融资、裁员、日报、周报、合集。

不适合严肃公告、法律/医疗/金融结论，或必须保持克制语气的内容。

## 生成效果

会引导 AI 生成类似这样的标题结构：

| 风格 | 特点 |
|---|---|
| 情绪爆点式 | 先抛冲突，再拉高情绪密度 |
| 多事件合并式 | 3-6 个事件压缩进一个长标题 |
| 数字悬念式 | 金额、估值、排名做开场钩子 |
| 日报式 | 按时间线平铺，以 `\| AI日报MMDD` 收束 |
| 对比冲突式 | 公司/模型/人物之间的对立与反转 |

## 使用技巧

素材越具体，标题越像。建议给出：**实体名 + 关键事实 + 数字 + 不确定性 + 期望形式**。

示例：

```text
用黑鸦风格写 3 个标题。

素材：
- OpenAI 发布新模型，主打代码能力
- 多家开发者工具开始接入
- 价格比上一代更低
- 目前只是官方发布信息，不要写成已经击败所有对手
```

注意事项：
- 不编造输入里没有的公司、数字、结论。
- 不确定消息保留「或将」「疑似」「被曝」等语气。
- 可要求「降低情绪强度」或「保留黑鸦节奏但减少夸张词」。

## 相关链接

- [skills.sh 页面](https://skills.sh/chouchiu/heya-skill)
- [黑鸦 B 站主页](https://space.bilibili.com/3706929260006322)

## License

MIT. See [LICENSE](LICENSE).
