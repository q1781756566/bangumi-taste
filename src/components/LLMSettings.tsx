"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { LLMConfig, LLMProvider } from "@/lib/types";

const MODELS: Record<LLMProvider, string[]> = {
  claude: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-6"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1"],
  custom: [],
};

async function fetchRemoteModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  // Normalize: strip trailing slashes and /chat/completions suffix
  const base = baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions\/?$/, "");

  // Try candidate URLs in order
  const candidates = [base + "/models"];
  // If base doesn't already end with /v1, also try with /v1
  if (!/\/v1\/?$/.test(base)) {
    candidates.push(base + "/v1/models");
  }

  let lastError: Error | null = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      const list: { id: string }[] = json.data ?? json;
      if (!Array.isArray(list)) {
        lastError = new Error("Unexpected response format");
        continue;
      }
      return list.map((m) => m.id).sort();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Network error");
    }
  }
  throw lastError ?? new Error("获取失败");
}

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
  const [remoteModels, setRemoteModels] = useState<string[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  // Per-provider cache so switching doesn't lose user input
  const snapshots = useRef<Partial<Record<LLMProvider, ProviderSnapshot>>>({});
  // Cache fetched models per baseUrl to avoid redundant requests
  const modelsCache = useRef<Record<string, string[]>>({});

  const update = (partial: Partial<LLMConfig>) => {
    onChange({ ...config, ...partial });
  };

  const doFetchModels = useCallback(async (baseUrl: string, apiKey: string) => {
    if (!baseUrl) return;
    const cacheKey = baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions\/?$/, "");
    if (modelsCache.current[cacheKey]) {
      setRemoteModels(modelsCache.current[cacheKey]);
      setModelError("");
      return;
    }
    setModelLoading(true);
    setModelError("");
    try {
      const models = await fetchRemoteModels(baseUrl, apiKey);
      modelsCache.current[cacheKey] = models;
      setRemoteModels(models);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setModelError(msg);
      setRemoteModels([]);
    } finally {
      setModelLoading(false);
    }
  }, []);

  // Auto-fetch when baseUrl and apiKey are both present for custom provider
  useEffect(() => {
    if (config.provider !== "custom" || !config.baseUrl) {
      setRemoteModels([]);
      return;
    }
    const cacheKey = config.baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions\/?$/, "");
    if (modelsCache.current[cacheKey]) {
      setRemoteModels(modelsCache.current[cacheKey]);
      return;
    }
    // Debounce: wait 600ms after user stops typing
    const timer = setTimeout(() => {
      doFetchModels(config.baseUrl!, config.apiKey);
    }, 600);
    return () => clearTimeout(timer);
  }, [config.provider, config.baseUrl, config.apiKey, doFetchModels]);

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
            <label className="block text-sm font-medium mb-1">
              模型
              {config.provider === "custom" && (
                <button
                  type="button"
                  onClick={() => {
                    modelsCache.current = {};
                    setRemoteModels([]);
                    if (config.baseUrl) doFetchModels(config.baseUrl, config.apiKey);
                  }}
                  disabled={modelLoading || !config.baseUrl}
                  className="ml-2 text-xs text-primary hover:text-primary/80 disabled:text-muted cursor-pointer"
                >
                  {modelLoading ? "获取中..." : "刷新列表"}
                </button>
              )}
            </label>
            {config.provider !== "custom" ? (
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
            ) : remoteModels.length > 0 ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  placeholder="搜索模型..."
                  className="w-full px-3 py-1.5 rounded-lg border border-card-border bg-card text-foreground text-xs"
                />
                <select
                  value={config.model}
                  onChange={(e) => { update({ model: e.target.value }); setModelFilter(""); }}
                  size={Math.min(remoteModels.filter((m) => !modelFilter || m.toLowerCase().includes(modelFilter.toLowerCase())).length, 6)}
                  className="w-full px-3 py-1 rounded-lg border border-card-border bg-card text-foreground text-sm"
                >
                  {remoteModels
                    .filter((m) => !modelFilter || m.toLowerCase().includes(modelFilter.toLowerCase()))
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
                {config.model && (
                  <p className="text-xs text-muted">当前: {config.model}</p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => update({ model: e.target.value })}
                  placeholder={modelLoading ? "正在获取模型列表..." : "输入模型名称，或填写 Base URL 自动获取"}
                  className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
                />
                {modelError && (
                  <p className="text-xs text-red-400 mt-1">模型列表获取失败（{modelError}），可手动输入</p>
                )}
              </div>
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
