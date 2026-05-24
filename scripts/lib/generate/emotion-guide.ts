import type { AnalysisData } from "../types.ts";

/** 生成「情绪指南」段落 — 基于情绪强度和 sentiment 分析 */
export function genEmotionGuide(data: AnalysisData): string {
  const lines: string[] = [];
  lines.push("### 情绪词使用指南");
  lines.push("");

  // 情绪强度分布
  if (data.emotionIntensity) {
    const { avgScore, distribution } = data.emotionIntensity;
    lines.push(`**平均情绪强度**：${avgScore} 分`);
    lines.push("");
    lines.push("**强度分布**：");
    for (const [level, count] of Object.entries(distribution)) {
      const pct =
        data.meta.totalVideos > 0
          ? ((count / data.meta.totalVideos) * 100).toFixed(0)
          : "0";
      lines.push(`- ${level}: ${count} 个（${pct}%）`);
    }
    lines.push("");
  }

  // 高频情绪词 + 使用建议
  const { emotion } = data.keywords;
  if (emotion.length > 0) {
    lines.push("**必用情绪词（按频次排序）**：");
    lines.push("");
    lines.push("| 情绪词 | 频次 | 强度 | 用法 |");
    lines.push("|--------|------|------|------|");

    const intensityMap: Record<string, { level: string; usage: string }> = {
      大地震: { level: "极强", usage: "开头，制造震撼" },
      引爆: { level: "强烈", usage: "搭配「深夜」，事件爆发" },
      杀疯了: { level: "强烈", usage: "搭配公司名，表示碾压" },
      海啸: { level: "极强", usage: "搭配「席卷」，表示冲击" },
      雪崩: { level: "极强", usage: "搭配「全面」，表示崩溃" },
      震撼: { level: "强烈", usage: "开头「震撼官宣」" },
      后背发凉: { level: "强烈", usage: "悬念式开头" },
      头皮发麻: { level: "强烈", usage: "悬念式开头" },
      瘫坐: { level: "中等", usage: "描述对手反应" },
      窒息: { level: "中等", usage: "描述对手反应" },
      重磅: { level: "中等", usage: "搭配「炸弹」" },
      官宣: { level: "中等", usage: "正式发布" },
      见证历史: { level: "强烈", usage: "里程碑事件" },
      奇点: { level: "强烈", usage: "技术突破" },
      核弹: { level: "极强", usage: "搭配「级」" },
    };

    for (const e of emotion.slice(0, 12)) {
      const info = intensityMap[e.word] || { level: "中等", usage: "通用" };
      lines.push(`| ${e.word} | ${e.count} | ${info.level} | ${info.usage} |`);
    }
    lines.push("");
  }

  // 情绪词搭配模式
  lines.push("**情绪词搭配公式**：");
  lines.push("");
  lines.push("```");
  lines.push("{情绪词}！{公司/产品}{动作}，{后果}！");
  lines.push("例：震撼官宣！DeepSeek 服务完成提速扩容，算力霸权神话破灭！");
  lines.push("```");
  lines.push("");
  lines.push("```");
  lines.push("{身体反应}！{事件}，{疑问/后果}？");
  lines.push("例：后背发凉！Kimi 突发大面积封号，真相居然是？");
  lines.push("```");
  lines.push("");
  lines.push("```");
  lines.push("{灾难隐喻}！{事件1}！{事件2}！{事件3}！");
  lines.push("例：硅谷全面雪崩！DeepSeek宣布永久降价！智谱新模型无预警发布！");
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
