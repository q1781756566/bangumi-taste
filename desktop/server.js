const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = 18932;
const STATIC_DIR = path.join(__dirname, "www");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

function getMime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function tryFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) return filePath;
  } catch {}
  return null;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);

  // Resolve file path
  let filePath = tryFile(path.join(STATIC_DIR, urlPath));

  // Try index.html for directory
  if (!filePath) {
    filePath = tryFile(path.join(STATIC_DIR, urlPath, "index.html"));
  }

  // SPA fallback
  if (!filePath) {
    filePath = tryFile(path.join(STATIC_DIR, "index.html"));
  }

  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": getMime(filePath) });
  res.end(content);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log("====================================");
  console.log("  Bangumi 品味分析器");
  console.log(`  已启动: ${url}`);
  console.log("  关闭此窗口即可退出");
  console.log("====================================");

  // Open browser
  const platform = process.platform;
  if (platform === "win32") exec(`start ${url}`);
  else if (platform === "darwin") exec(`open ${url}`);
  else exec(`xdg-open ${url}`);
});
