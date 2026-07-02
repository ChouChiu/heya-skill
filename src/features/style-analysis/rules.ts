export const emotionWords = [
  "炸裂",
  "震撼",
  "惊人",
  "离谱",
  "疯狂",
  "崩了",
  "爆了",
  "杀疯",
  "重大",
  "突发",
  "逆天",
  "惨烈",
  "恐怖",
  "完了",
  "翻车",
  "开战",
  "沸腾",
  "地震",
  "核弹",
  "泄密",
  "泄露",
];

export const topicWords = [
  "AI",
  "模型",
  "大模型",
  "机器人",
  "芯片",
  "游戏",
  "国产",
  "发布",
  "引爆",
  "泄露",
  "裁员",
  "融资",
  "开源",
  "上市",
];

export const peopleWords = [
  "马斯克",
  "奥特曼",
  "梁文峰",
  "黄仁勋",
  "雷军",
  "扎克伯格",
  "库克",
  "李彦宏",
  "周鸿祎",
  "孙正义",
  "苏姿丰",
  "杨立昆",
  "李飞飞",
  "Sam Altman",
  "Elon Musk",
  "Jensen Huang",
  "Satya Nadella",
  "Sundar Pichai",
  "Demis Hassabis",
  "Dario Amodei",
];

export const brandWords = [
  "OpenAI",
  "ChatGPT",
  "GPT",
  "Claude",
  "Gemini",
  "DeepSeek",
  "Qwen",
  "Sora",
  "Grok",
  "Mistral",
  "Perplexity",
  "Anthropic",
  "Midjourney",
  "Stable Diffusion",
  "谷歌",
  "苹果",
  "微软",
  "英伟达",
  "特斯拉",
  "Meta",
  "字节",
  "阿里",
  "腾讯",
  "百度",
  "华为",
  "小米",
  "xAI",
];

export const separators = /[，,；;、｜|：:！!？?]/g;

// Build a regex from the `emotionWords` array so `categoryRules`
// stays in sync — add a word to the list, it automatically applies.
const emotionPattern = emotionWords
  .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

export const categoryRules = [
  { name: "日报式", pattern: /AI日报|日报|\|\s*AI/i },
  { name: "情绪爆点", pattern: new RegExp(`${emotionPattern}|！|!`) },
  { name: "对比冲突", pattern: /却|但是|反而|大战|硬刚|超越|击败|不敌|挑战/ },
  { name: "多事件合并", pattern: /[；;｜|].*[；;｜|]|，.*，/ },
  { name: "数字悬念", pattern: /\d+|首次|第一|万|亿/ },
] as const;
