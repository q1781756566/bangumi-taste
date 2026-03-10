"use client";

import type { TasteAnalysis } from "@/lib/types";

interface Props {
  analysis: TasteAnalysis;
  username: string;
  type?: "动画" | "游戏";
}

export default function TasteReport({ analysis, username, type }: Props) {
  const typeLabel = type ? `${type}` : "";
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary */}
      <section className="bg-card border border-card-border rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-3">
          {username} 的{typeLabel}品味画像
        </h2>
        <p className="text-foreground/80 leading-relaxed">{analysis.summary}</p>
      </section>

      {/* Taste Tags */}
      <section className="bg-card border border-card-border rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4">品味标签</h2>
        <div className="flex flex-wrap gap-3">
          {analysis.tasteTags.map((tag, i) => (
            <div
              key={i}
              className="group relative bg-accent border border-primary/20 rounded-full px-4 py-2 cursor-default"
            >
              <span className="text-sm font-medium text-primary">{tag.label}</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {tag.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rating Analysis */}
      <section className="bg-card border border-card-border rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-3">评分倾向</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {analysis.ratingAnalysis.average.toFixed(1)}
            </div>
            <div className="text-xs text-muted">平均分</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {analysis.ratingAnalysis.median}
            </div>
            <div className="text-xs text-muted">中位数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {analysis.ratingAnalysis.tendency}
            </div>
            <div className="text-xs text-muted">倾向</div>
          </div>
        </div>
        <p className="text-sm text-foreground/70">{analysis.ratingAnalysis.description}</p>
      </section>

      {/* Unique Traits */}
      <section className="bg-card border border-card-border rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-3">独特特征</h2>
        <ul className="space-y-2">
          {analysis.uniqueTraits.map((trait, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5 shrink-0">*</span>
              <span>{trait}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Hidden Gems */}
      {analysis.hiddenGems.length > 0 && (
        <section className="bg-card border border-card-border rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-3">冷门佳作发现</h2>
          <div className="space-y-3">
            {analysis.hiddenGems.map((gem, i) => (
              <div key={i} className="border-l-2 border-primary/40 pl-4">
                <div className="font-medium text-sm">{gem.name}</div>
                <div className="text-xs text-muted mt-1">{gem.reason}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
