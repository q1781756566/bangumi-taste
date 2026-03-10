"use client";

import { useState, useRef } from "react";
import type { LLMConfig, LLMProvider } from "@/lib/types";

const MODELS: Record<LLMProvider, string[]> = {
  claude: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-6"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
  custom: [],
};

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  custom: "自定义 (OpenAI 兼容)",
  claude: "Claude (Anthropic)",
  openai: "OpenAI",
};

interface ProviderSnapshot {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface Props {
  config: LLMConfig;
  onChange: (config: LLMConfig) => void;
  inline?: boolean;
}

export default function LLMSettings({ config, onChange, inline = false }: Props) {
  const [open, setOpen] = useState(false);

  // Per-provider cache so switching doesn't lose user input
  const snapshots = useRef<Partial<Record<LLMProvider, ProviderSnapshot>>>({});

  const update = (partial: Partial<LLMConfig>) => {
    onChange({ ...config, ...partial });
  };

  const switchProvider = (provider: LLMProvider) => {
    // Save current provider's state
    snapshots.current[config.provider] = {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    };

    // Restore target provider's state, or use defaults
    const saved = snapshots.current[provider];
    const defaultModel = MODELS[provider][0] || "";

    update({
      provider,
      apiKey: saved?.apiKey ?? "",
      model: saved?.model || defaultModel,
      baseUrl: saved?.baseUrl ?? (provider === "custom" ? "" : undefined),
    });
  };

  const showContent = inline || open;

  return (
    <div>
      {inline ? (
        <h3 className="text-sm font-semibold mb-3 text-foreground">LLM 设置</h3>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="text-sm text-muted hover:text-primary transition-colors cursor-pointer"
        >
          {open ? "收起" : "展开"} LLM 设置
        </button>
      )}

      {showContent && (
        <div className={`space-y-3 ${inline ? "" : "mt-3 animate-fade-in"}`}>
          <div>
            <label className="block text-sm font-medium mb-1">提供商</label>
            <select
              value={config.provider}
              onChange={(e) => switchProvider(e.target.value as LLMProvider)}
              className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
            >
              {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">模型</label>
            {MODELS[config.provider].length > 0 ? (
              <select
                value={config.model}
                onChange={(e) => update({ model: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
              >
                {MODELS[config.provider].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={config.model}
                onChange={(e) => update({ model: e.target.value })}
                placeholder="输入模型名称"
                className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
              />
            )}
          </div>

          {config.provider === "custom" && (
            <div>
              <label className="block text-sm font-medium mb-1">Base URL</label>
              <input
                type="text"
                value={config.baseUrl || ""}
                onChange={(e) => update({ baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
