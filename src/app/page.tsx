"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import LLMSettings from "@/components/LLMSettings";
import BangumiSettings from "@/components/BangumiSettings";
import TasteReport from "@/components/TasteReport";
import Recommendations from "@/components/Recommendations";
import type { BangumiCollection, BangumiCollectionResponse, BangumiUser, LLMConfig, TasteAnalysis } from "@/lib/types";
import { buildAnimeAnalysisPrompt, buildGameAnalysisPrompt } from "@/lib/prompts";
import { callLLM } from "@/lib/llm";

const Charts = dynamic(() => import("@/components/Charts"), { ssr: false });

/** Override LLM-generated average/median with precise front-end calculation */
function fixRatingStats(analysis: TasteAnalysis, collections: BangumiCollection[]): TasteAnalysis {
  const rated = collections.filter((c) => c.rate > 0).map((c) => c.rate);
  if (rated.length === 0) return analysis;
  const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
  const sorted = [...rated].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    ...analysis,
    ratingAnalysis: { ...analysis.ratingAnalysis, average: avg, median },
  };
}

type Stage = "input" | "fetching" | "analyzing" | "done" | "error";
type AuthMode = "username" | "token";
type TabKey = "anime" | "game";

// ---- localStorage helpers ----

const LS_LLM_KEY = "bangumi-taste-llm-config";
const LS_BGM_KEY = "bangumi-taste-bgm-settings";
const LS_CACHE_PREFIX = "bangumi-taste-result-v2-";

interface BgmSettings {
  authMode: AuthMode;
  username: string;
  token: string;
  analyzeAnime: boolean;
  analyzeGame: boolean;
}

interface CachedResult {
  user: BangumiUser;
  animeCollections: BangumiCollection[];
  gameCollections: BangumiCollection[];
  animeAnalysis: TasteAnalysis | null;
  gameAnalysis: TasteAnalysis | null;
  timestamp: number;
}

function lsLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return fallback;
}

function lsSave(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function loadLLMConfig(): LLMConfig {
  return lsLoad(LS_LLM_KEY, { provider: "custom" as const, apiKey: "", model: "", baseUrl: "" });
}

function loadBgmSettings(): BgmSettings {
  return lsLoad(LS_BGM_KEY, { authMode: "username" as const, username: "", token: "", analyzeAnime: true, analyzeGame: true });
}

function getCacheKey(username: string) {
  return LS_CACHE_PREFIX + username.toLowerCase();
}

function loadCachedResult(username: string): CachedResult | null {
  if (!username) return null;
  return lsLoad<CachedResult | null>(getCacheKey(username), null);
}

function saveCachedResult(username: string, result: CachedResult) {
  lsSave(getCacheKey(username), result);
}

// ---- API helpers (direct browser calls) ----

const BGM_API = "https://api.bgm.tv";

async function bgmFetch(path: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BGM_API}${path}`, { headers });
  if (!res.ok) {
    if (res.status === 404) throw new Error("用户不存在或收藏未公开");
    throw new Error(`Bangumi API 请求失败: ${res.status}`);
  }
  return res.json();
}

async function fetchAllCollections(
  username: string, subjectType: number, token?: string,
): Promise<BangumiCollection[]> {
  const all: BangumiCollection[] = [];
  let offset = 0;
  const limit = 50;
  while (true) {
    const data: BangumiCollectionResponse = await bgmFetch(
      `/v0/users/${username}/collections?subject_type=${subjectType}&limit=${limit}&offset=${offset}`, token,
    );
    all.push(...data.data);
    if (offset + limit >= data.total) break;
    offset += limit;
  }
  return all;
}

// ---- Component ----

const BGM_DEFAULTS: BgmSettings = { authMode: "username", username: "", token: "", analyzeAnime: true, analyzeGame: true };
const LLM_DEFAULTS: LLMConfig = { provider: "custom", apiKey: "", model: "", baseUrl: "" };

export default function Home() {
  const [bgmSettings, setBgmSettings] = useState<BgmSettings>(BGM_DEFAULTS);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(LLM_DEFAULTS);
  const [stage, setStage] = useState<Stage>("input");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [user, setUser] = useState<BangumiUser | null>(null);
  const [animeCollections, setAnimeCollections] = useState<BangumiCollection[]>([]);
  const [gameCollections, setGameCollections] = useState<BangumiCollection[]>([]);
  const [animeAnalysis, setAnimeAnalysis] = useState<TasteAnalysis | null>(null);
  const [gameAnalysis, setGameAnalysis] = useState<TasteAnalysis | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("anime");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const pickDefaultTab = (anime: TasteAnalysis | null, game: TasteAnalysis | null): TabKey => {
    if (anime) return "anime";
    if (game) return "game";
    return "anime";
  };

  // Load persisted state after hydration
  useEffect(() => {
    const savedBgm = loadBgmSettings();
    const savedLLM = loadLLMConfig();
    setBgmSettings(savedBgm);
    setLLMConfig(savedLLM);

    // Restore cached result
    const target = savedBgm.authMode === "username" ? savedBgm.username : "";
    if (target) {
      const cached = loadCachedResult(target);
      if (cached) {
        setUser(cached.user);
        setAnimeCollections(cached.animeCollections);
        setGameCollections(cached.gameCollections);
        setAnimeAnalysis(cached.animeAnalysis);
        setGameAnalysis(cached.gameAnalysis);
        setFromCache(true);
        setStage("done");
        setActiveTab(pickDefaultTab(cached.animeAnalysis, cached.gameAnalysis));
      }
    }
    setHydrated(true);

    // DEBUG: load mock report for testing export (remove before release)
    // ?mock tries to load any cached result from localStorage first
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mock")) {
      let found = false;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(LS_CACHE_PREFIX)) {
            const cached: CachedResult = JSON.parse(localStorage.getItem(key)!);
            if (cached?.user && (cached.animeAnalysis || cached.gameAnalysis)) {
              setUser(cached.user);
              setAnimeCollections(cached.animeCollections ?? []);
              setGameCollections(cached.gameCollections ?? []);
              setAnimeAnalysis(cached.animeAnalysis);
              setGameAnalysis(cached.gameAnalysis);
              setStage("done");
              setActiveTab(pickDefaultTab(cached.animeAnalysis, cached.gameAnalysis));
              found = true;
              break;
            }
          }
        }
      } catch { /* ignore */ }

      if (!found) {
        // Fallback: hardcoded mock data
        const mockAnalysis: TasteAnalysis = {
          summary: "你是一个偏好深度叙事与世界观构建的观众，对制作精良的作品有着敏锐的鉴赏力。",
          tasteTags: [
            { label: "叙事控", description: "偏好故事驱动的深度作品" },
            { label: "美学派", description: "对视觉表现和演出有较高要求" },
            { label: "世界观爱好者", description: "喜欢宏大且自洽的世界设定" },
            { label: "慢热型", description: "能接受前期铺垫较长的作品" },
          ],
          genrePreferences: [
            { genre: "科幻", score: 92, count: 18 },
            { genre: "奇幻", score: 85, count: 15 },
            { genre: "悬疑", score: 78, count: 12 },
            { genre: "日常", score: 60, count: 8 },
            { genre: "运动", score: 35, count: 3 },
          ],
          ratingAnalysis: {
            average: 7.4, median: 8, tendency: "偏严格",
            description: "你的评分普遍低于大众平均，说明你对作品质量有较高的标准。",
          },
          uniqueTraits: ["对冷门佳作有独到的发现眼光", "评分标准始终如一", "偏好原创作品胜过改编作品"],
          hiddenGems: [{ name: "少女终末旅行", reason: "你给出了9分高评价，但该作品关注度偏低" }],
          recommendations: [
            { name: "来自新世界", reason: "深度叙事+世界观构建，符合你的核心偏好" },
            { name: "奇巧计程车", reason: "精巧的群像剧本，悬疑感十足" },
            { name: "乒乓", reason: "独特美学风格，汤浅政明代表作" },
          ],
        };
        setUser({ id: 0, username: "test_user", nickname: "测试用户", avatar: { large: "", medium: "", small: "" }, sign: "" });
        setAnimeCollections(Array.from({ length: 42 }, (_, i) => ({
          subject_id: i, subject_type: 2, rate: Math.floor(Math.random() * 4) + 6,
          type: 2, comment: "", tags: [], updated_at: `2024-${String((i % 12) + 1).padStart(2, "0")}-01`,
          subject: { id: i, type: 2, name: `Anime ${i}`, name_cn: `动画${i}`, summary: "", date: `2024-${String((i % 12) + 1).padStart(2, "0")}-01`, score: Math.random() * 2 + 6, rank: i * 10, collection_total: 1000, eps: 12 },
        })));
        setGameCollections([]);
        setAnimeAnalysis(mockAnalysis);
        setGameAnalysis(null);
        setStage("done");
        setActiveTab("anime");
      }
    }
  }, []);

  const handleBgmChange = useCallback((settings: BgmSettings) => {
    setBgmSettings(settings);
    lsSave(LS_BGM_KEY, settings);
  }, []);

  const handleLLMChange = useCallback((config: LLMConfig) => {
    setLLMConfig(config);
    lsSave(LS_LLM_KEY, config);
  }, []);

  const inputValue = bgmSettings.authMode === "username" ? bgmSettings.username : bgmSettings.token;
  const canSubmit = inputValue.trim() && stage !== "fetching" && stage !== "analyzing" && (bgmSettings.analyzeAnime || bgmSettings.analyzeGame);

  const handleExport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const { exportReportAsImage } = await import("@/lib/exportImage");
      await exportReportAsImage({
        reportEl: reportRef.current,
        title: effectiveTab === "anime" ? "动画品味报告" : "游戏品味报告",
        nickname: user?.nickname || bgmSettings.username,
        avatarUrl: user?.avatar?.medium,
        animeCount: effectiveTab === "anime" ? animeCollections.length : 0,
        gameCount: effectiveTab === "game" ? gameCollections.length : 0,
      });
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleAnalyze = async (forceRefresh = false) => {
    const { authMode, username, token: bgmToken } = bgmSettings;
    if (authMode === "username" && !username.trim()) return;
    if (authMode === "token" && !bgmToken.trim()) return;
    if (!llmConfig.apiKey) {
      setError("请先在设置中填写 LLM API Key");
      setStage("error");
      return;
    }

    // Check cache
    if (!forceRefresh && authMode === "username") {
      const cached = loadCachedResult(username.trim());
      if (cached) {
        setUser(cached.user);
        setAnimeCollections(cached.animeCollections);
        setGameCollections(cached.gameCollections);
        setAnimeAnalysis(cached.animeAnalysis);
        setGameAnalysis(cached.gameAnalysis);
        setFromCache(true);
        setStage("done");
        setActiveTab(pickDefaultTab(cached.animeAnalysis, cached.gameAnalysis));
        return;
      }
    }

    setStage("fetching");
    setError("");
    setAnimeAnalysis(null);
    setGameAnalysis(null);
    setFromCache(false);

    const token = authMode === "token" ? bgmToken.trim() : undefined;

    try {
      setProgress("正在获取用户信息...");
      let userData: BangumiUser;
      let resolvedUsername: string;

      if (authMode === "token") {
        userData = await bgmFetch("/v0/me", token);
        resolvedUsername = userData.username;
      } else {
        userData = await bgmFetch(`/v0/users/${username.trim()}`);
        resolvedUsername = username.trim();
      }
      setUser(userData);

      let anime: BangumiCollection[] = [];
      let games: BangumiCollection[] = [];

      if (bgmSettings.analyzeAnime) {
        setProgress("正在获取动画收藏...");
        anime = await fetchAllCollections(resolvedUsername, 2, token);
      }
      setAnimeCollections(anime);

      if (bgmSettings.analyzeGame) {
        setProgress("正在获取游戏收藏...");
        games = await fetchAllCollections(resolvedUsername, 4, token);
      }
      setGameCollections(games);

      if (anime.length === 0 && games.length === 0) {
        throw new Error("所选类别没有收藏数据");
      }

      const parts = [];
      if (anime.length > 0) parts.push(`${anime.length} 部动画`);
      if (games.length > 0) parts.push(`${games.length} 款游戏`);
      setProgress(`获取完成: ${parts.join(", ")}。正在进行 AI 分析...`);
      setStage("analyzing");

      const [animeResult, gameResult] = await Promise.all([
        anime.length > 0
          ? callLLM(buildAnimeAnalysisPrompt(resolvedUsername, anime), llmConfig)
          : null,
        games.length > 0
          ? callLLM(buildGameAnalysisPrompt(resolvedUsername, games), llmConfig)
          : null,
      ]);

      const fixedAnime = animeResult ? fixRatingStats(animeResult, anime) : null;
      const fixedGame = gameResult ? fixRatingStats(gameResult, games) : null;
      setAnimeAnalysis(fixedAnime);
      setGameAnalysis(fixedGame);
      setStage("done");

      setActiveTab(pickDefaultTab(fixedAnime, fixedGame));

      // Cache
      saveCachedResult(resolvedUsername, {
        user: userData,
        animeCollections: anime,
        gameCollections: games,
        animeAnalysis: fixedAnime,
        gameAnalysis: gameResult,
        timestamp: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  };

  const isLoading = stage === "fetching" || stage === "analyzing";
  const hasAnime = animeAnalysis !== null;
  const hasGame = gameAnalysis !== null;
  const tabs: { key: TabKey; label: string; available: boolean }[] = [
    { key: "anime", label: "动画", available: hasAnime },
    { key: "game", label: "游戏", available: hasGame },
  ];
  // Ensure activeTab points to an available analysis (safety fallback)
  const effectiveTab = (activeTab === "anime" && animeAnalysis) || !gameAnalysis ? "anime" : "game";
  const currentAnalysis = effectiveTab === "anime" ? animeAnalysis : gameAnalysis;
  const currentCollections = effectiveTab === "anime" ? animeCollections : gameCollections;
  const currentType = effectiveTab === "anime" ? "动画" as const : "游戏" as const;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Bangumi 品味分析器
            </span>
          </h1>
          <p className="text-muted text-sm max-w-md mx-auto leading-relaxed">
            连接你的 Bangumi 账户，让 AI 深度解读你的动画与游戏品味
          </p>
        </div>

        {/* Settings Panel */}
        <div className="bg-card border border-card-border rounded-2xl mb-6 overflow-hidden">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 text-muted transition-transform ${settingsOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-medium">设置</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              {bgmSettings.username && bgmSettings.authMode === "username" && (
                <span className="bg-accent px-2 py-0.5 rounded">@{bgmSettings.username}</span>
              )}
              {bgmSettings.token && bgmSettings.authMode === "token" && (
                <span className="bg-accent px-2 py-0.5 rounded">Token 已配置</span>
              )}
              {llmConfig.apiKey && (
                <span className="bg-accent px-2 py-0.5 rounded">{llmConfig.model}</span>
              )}
            </div>
          </button>

          {settingsOpen && (
            <div className="px-6 pb-6 animate-fade-in">
              <div className="grid gap-6 md:grid-cols-2">
                <BangumiSettings settings={bgmSettings} onChange={handleBgmChange} />
                <LLMSettings config={llmConfig} onChange={handleLLMChange} inline />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => handleAnalyze(false)}
            disabled={!canSubmit || !llmConfig.apiKey}
            className="px-10 py-3 bg-primary text-white rounded-xl font-medium text-base hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                分析中...
              </span>
            ) : "开始分析"}
          </button>
        </div>

        {/* Progress */}
        {isLoading && (
          <div className="bg-card border border-card-border rounded-2xl p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{progress}</span>
            </div>
            {stage === "analyzing" && (
              <p className="text-xs text-muted mt-2 animate-pulse-soft">
                AI 正在分别分析你的动画和游戏品味，这可能需要 30-60 秒...
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6 animate-fade-in">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setStage("input")}
              className="mt-3 text-sm text-primary hover:underline cursor-pointer"
            >
              返回重试
            </button>
          </div>
        )}

        {/* Results */}
        {stage === "done" && (animeAnalysis || gameAnalysis) && (
          <div className="space-y-6">
            {/* User Info */}
            {user && (
              <div className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-4 animate-fade-in">
                {user.avatar?.medium && (
                  <img src={user.avatar.medium} alt={user.nickname} className="w-12 h-12 rounded-full" />
                )}
                <div>
                  <div className="font-medium">{user.nickname}</div>
                  <div className="text-xs text-muted">
                    @{user.username}
                    {animeAnalysis && ` | ${animeCollections.length} 动画`}
                    {gameAnalysis && ` | ${gameCollections.length} 游戏`}
                    {fromCache && " | 缓存结果"}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  {fromCache && (
                    <button
                      onClick={() => handleAnalyze(true)}
                      disabled={isLoading || !llmConfig.apiKey}
                      className="text-sm text-primary hover:underline cursor-pointer disabled:opacity-50"
                    >
                      重新分析
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setStage("input");
                      setAnimeAnalysis(null);
                      setGameAnalysis(null);
                      setFromCache(false);
                    }}
                    className="text-sm text-muted hover:text-foreground cursor-pointer"
                  >
                    返回
                  </button>
                </div>
              </div>
            )}

            {/* Tabs */}
            {hasAnime && hasGame && (
              <div className="flex gap-1 bg-card border border-card-border rounded-xl p-1">
                {tabs.filter((t) => t.available).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      effectiveTab === tab.key
                        ? "bg-primary text-white"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}品味报告
                  </button>
                ))}
              </div>
            )}

            {/* Active Tab Content */}
            {currentAnalysis && (
              <div key={effectiveTab} className="animate-fade-in">
                <div ref={reportRef}>
                  <TasteReport analysis={currentAnalysis} username={user?.nickname || bgmSettings.username} type={currentType} />
                  <div className="mt-6">
                    <Recommendations recommendations={currentAnalysis.recommendations} type={currentType} />
                  </div>
                  <div className="mt-6">
                    <Charts collections={currentCollections} analysis={currentAnalysis} type={currentType} />
                  </div>
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-primary/20"
                  >
                    {exporting ? "导出中..." : "导出我的报告"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
