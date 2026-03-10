"use client";

interface BgmSettings {
  authMode: "username" | "token";
  username: string;
  token: string;
}

interface Props {
  settings: BgmSettings;
  onChange: (settings: BgmSettings) => void;
}

export default function BangumiSettings({ settings, onChange }: Props) {
  const update = (partial: Partial<BgmSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-foreground">Bangumi 账户</h3>

      {/* Auth Mode Toggle */}
      <div className="flex gap-1 mb-3 bg-background rounded-lg p-1">
        <button
          onClick={() => update({ authMode: "username" })}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            settings.authMode === "username"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          用户名
        </button>
        <button
          onClick={() => update({ authMode: "token" })}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            settings.authMode === "token"
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Access Token
        </button>
      </div>

      {settings.authMode === "username" ? (
        <div>
          <label className="block text-sm font-medium mb-1">用户名</label>
          <input
            type="text"
            value={settings.username}
            onChange={(e) => update({ username: e.target.value })}
            placeholder="Bangumi 用户名"
            className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-1">Access Token</label>
          <input
            type="password"
            value={settings.token}
            onChange={(e) => update({ token: e.target.value })}
            placeholder="输入 Access Token"
            className="w-full px-3 py-2 rounded-lg border border-card-border bg-card text-foreground text-sm"
          />
          <p className="text-xs text-muted mt-2">
            使用 Token 可获取"仅自己可见"的收藏。
            <a
              href="https://next.bgm.tv/demo/access-token"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              创建 Token
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
