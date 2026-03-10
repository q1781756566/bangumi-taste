"use client";

import type { TasteAnalysis } from "@/lib/types";

interface Props {
  recommendations: TasteAnalysis["recommendations"];
  type?: "动画" | "游戏";
}

export default function Recommendations({ recommendations, type }: Props) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <section className="bg-card border border-card-border rounded-2xl p-6 animate-fade-in">
      <h2 className="text-lg font-bold mb-4">{type ? `${type}推荐` : "为你推荐"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="bg-accent/50 border border-card-border rounded-xl p-4 hover:border-primary/30 transition-colors"
          >
            <div className="font-medium text-sm mb-1">{rec.name}</div>
            <div className="text-xs text-muted leading-relaxed">{rec.reason}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
