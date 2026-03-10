import type { BangumiCollection } from "./types";

const STATUS_LABELS: Record<number, string> = {
  1: "想看/想玩",
  2: "看过/玩过",
  3: "在看/在玩",
  4: "搁置",
  5: "抛弃",
};

function summarizeCollections(collections: BangumiCollection[], type: "动画" | "游戏"): string {
  if (collections.length === 0) return `没有${type}收藏数据。`;

  const rated = collections.filter((c) => c.rate > 0);
  const byStatus: Record<string, BangumiCollection[]> = {};

  for (const c of collections) {
    const label = STATUS_LABELS[c.type] || "未知";
    if (!byStatus[label]) byStatus[label] = [];
    byStatus[label].push(c);
  }

  const lines: string[] = [];
  lines.push(`## ${type}收藏 (共 ${collections.length} 部, ${rated.length} 部已评分)`);

  for (const [status, items] of Object.entries(byStatus)) {
    lines.push(`\n### ${status} (${items.length} 部)`);
  }

  if (rated.length > 0) {
    lines.push(`\n### 评分详情（已评分的${type}）`);
    const sorted = [...rated].sort((a, b) => b.rate - a.rate);
    for (const c of sorted.slice(0, 80)) {
      const name = c.subject.name_cn || c.subject.name;
      const tags = c.tags?.length ? ` [标签: ${c.tags.join(", ")}]` : "";
      const subjectTags = c.subject.tags?.slice(0, 5).map((t) => t.name).join(", ") || "";
      const tagInfo = subjectTags ? ` (类型: ${subjectTags})` : "";
      const publicScore = c.subject.score ? ` 大众评分:${c.subject.score}` : "";
      lines.push(`- ${name}: 用户评分 ${c.rate}/10${publicScore}${tagInfo}${tags}`);
    }
    if (sorted.length > 80) {
      lines.push(`... 还有 ${sorted.length - 80} 部已评分${type}`);
    }
  }

  const tagCounts: Record<string, number> = {};
  for (const c of collections) {
    for (const tag of c.subject.tags?.slice(0, 5) || []) {
      tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);
  if (topTags.length > 0) {
    lines.push(`\n### 热门标签`);
    lines.push(topTags.map(([tag, count]) => `${tag}(${count})`).join(", "));
  }

  return lines.join("\n");
}

const JSON_SCHEMA = `{
  "summary": "200-300字的品味总结，用第二人称'你'来描述",
  "tasteTags": [
    {"label": "简短标签（2-6字）", "description": "对这个标签的解释（20-40字）"}
  ],
  "genrePreferences": [
    {"genre": "类型名", "score": 0-100的偏好分数, "count": 该类型的作品数}
  ],
  "ratingAnalysis": {
    "average": 平均分,
    "median": 中位数,
    "tendency": "偏严格/偏宽松/中庸",
    "description": "对评分习惯的描述"
  },
  "uniqueTraits": ["独特品味特征1", "独特品味特征2"],
  "hiddenGems": [
    {"name": "作品名", "reason": "为什么这是该用户发现的冷门佳作"}
  ],
  "recommendations": [
    {"name": "推荐作品名", "reason": "推荐理由，需基于用户品味分析"}
  ]
}`;

const COMMON_REQUIREMENTS = `要求：
- tasteTags 给出 4-6 个标签
- genrePreferences 给出 6-10 个主要类型
- uniqueTraits 给出 3-5 个独特特征
- hiddenGems 给出 3-5 部冷门佳作
- recommendations 给出 5-8 部推荐作品（用户没看过/没玩过的）
- 分析要有洞察力，不要泛泛而谈
- 所有文本用中文`;

export function buildAnimeAnalysisPrompt(
  username: string,
  collections: BangumiCollection[],
): string {
  const summary = summarizeCollections(collections, "动画");

  return `你是一位资深的动画评论家和品味分析师。请根据以下 Bangumi 用户 "${username}" 的动画收藏数据，深入分析其动画品味。

${summary}

请以 JSON 格式返回分析结果，严格遵循以下结构（不要输出 JSON 以外的任何内容）：

${JSON_SCHEMA}

${COMMON_REQUIREMENTS}
- 重点关注：题材偏好、制作公司偏好、叙事风格（轻松日常/严肃剧情/实验性）、视觉风格偏好
- 推荐的作品必须是动画`;
}

export function buildGameAnalysisPrompt(
  username: string,
  collections: BangumiCollection[],
): string {
  const summary = summarizeCollections(collections, "游戏");

  return `你是一位资深的游戏评论家和品味分析师。请根据以下 Bangumi 用户 "${username}" 的游戏收藏数据，深入分析其游戏品味。

${summary}

请以 JSON 格式返回分析结果，严格遵循以下结构（不要输出 JSON 以外的任何内容）：

${JSON_SCHEMA}

${COMMON_REQUIREMENTS}
- 重点关注：游戏类型偏好（RPG/动作/策略/视觉小说等）、平台偏好、玩法风格（硬核/休闲）、叙事vs玩法倾向
- 推荐的作品必须是游戏`;
}
