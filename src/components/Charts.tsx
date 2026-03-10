"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { BangumiCollection, TasteAnalysis } from "@/lib/types";

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#6ee7b7", "#fbbf24", "#f87171",
  "#38bdf8", "#fb923c", "#a3e635", "#e879f9",
];

const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: "8px",
  fontSize: "12px",
};

interface Props {
  collections: BangumiCollection[];
  analysis: TasteAnalysis;
  type?: "动画" | "游戏";
}

export default function Charts({ collections, analysis, type }: Props) {
  const rated = collections.filter((c) => c.rate > 0);
  const isGame = type === "游戏";

  // Rating distribution
  const ratingDist = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: rated.filter((c) => c.rate === i + 1).length,
  }));

  // Status distribution
  const statusLabels: Record<number, string> = {
    1: isGame ? "想玩" : "想看",
    2: isGame ? "玩过" : "看过",
    3: isGame ? "在玩" : "在看",
    4: "搁置",
    5: "抛弃",
  };
  const statusDist = Object.entries(
    collections.reduce(
      (acc, c) => {
        const label = statusLabels[c.type] || "未知";
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).map(([name, value]) => ({ name, value }));

  // Genre preferences from analysis
  const genreData = analysis.genrePreferences.slice(0, 8);

  // Timeline: group by year-month
  const timelineMap: Record<string, number> = {};
  for (const c of collections) {
    if (c.updated_at) {
      const month = c.updated_at.slice(0, 7);
      timelineMap[month] = (timelineMap[month] || 0) + 1;
    }
  }
  const timeline = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .map(([date, count]) => ({ date, count }));

  // User vs public score comparison
  const scoreComparison = rated
    .filter((c) => c.subject.score > 0)
    .map((c) => ({
      name: c.subject.name_cn || c.subject.name,
      user: c.rate,
      public: c.subject.score,
      diff: +(c.rate - c.subject.score).toFixed(1),
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 20);

  const maxDiff = scoreComparison.length > 0
    ? Math.max(...scoreComparison.map((s) => Math.abs(s.diff)))
    : 1;

  return (
    <div className="space-y-6">
      {/* Rating Distribution + Status Pie side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">评分分布</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ratingDist} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={30} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="作品数" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">收藏状态</h2>
          <div className="flex items-center">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={85}
                    dataKey="value"
                    label={false}
                    labelLine={false}
                  >
                    {statusDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {statusDist.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Genre Preferences Radar */}
      {genreData.length > 0 && (
        <section className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">类型偏好</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={genreData}>
              <PolarGrid stroke="var(--card-border)" />
              <PolarAngleAxis dataKey="genre" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar
                dataKey="score"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.3}
                name="偏好度"
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <section className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">收藏时间线 (近24月)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timeline} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} width={30} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="var(--primary-light)" radius={[4, 4, 0, 0]} name="新增收藏" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* User vs Public Score */}
      {scoreComparison.length > 0 && (
        <section className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-1">个人评分 vs 大众评分</h2>
          <p className="text-xs text-muted mb-4">按评分差异排序，展示最"特立独行"的评分</p>
          <div className="space-y-2">
            {scoreComparison.map((item, i) => {
              const barWidth = maxDiff > 0 ? (Math.abs(item.diff) / maxDiff) * 100 : 0;
              const isHigher = item.diff > 0;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-card-border/50 last:border-b-0">
                  <div className="flex-1 min-w-0 text-sm truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-[200px]">
                    <span className="text-sm font-bold text-primary w-6 text-right">{item.user}</span>
                    <span className="text-xs text-muted">/</span>
                    <span className="text-sm text-muted w-8">{item.public}</span>
                    <div className="flex-1 flex items-center h-5">
                      {item.diff !== 0 && (
                        <div className="relative w-full h-full flex items-center">
                          <div className="absolute left-1/2 w-px h-full bg-card-border" />
                          {isHigher ? (
                            <div
                              className="absolute left-1/2 h-3 rounded-r bg-emerald-500/70"
                              style={{ width: `${barWidth / 2}%` }}
                            />
                          ) : (
                            <div
                              className="absolute right-1/2 h-3 rounded-l bg-rose-500/70"
                              style={{ width: `${barWidth / 2}%` }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium w-10 text-right ${
                      isHigher ? "text-emerald-600 dark:text-emerald-400" : item.diff < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted"
                    }`}>
                      {item.diff > 0 ? "+" : ""}{item.diff}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
