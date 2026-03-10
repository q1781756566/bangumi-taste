import { toCanvas } from "html-to-image";
import QRCode from "qrcode";

const SITE_URL = "https://q1781756566.github.io/bangumi-taste/";
const SCALE = 2;
const PAD = 32 * SCALE;
const BG = "#ffffff";

interface ExportOptions {
  reportEl: HTMLElement;
  title: string;
  nickname: string;
  avatarUrl?: string;
  animeCount: number;
  gameCount: number;
}

/** Load an image URL (or data URL) as HTMLImageElement */
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Convert remote image to data URL to bypass CORS */
async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((r) => {
    const reader = new FileReader();
    reader.onloadend = () => r(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function exportReportAsImage(opts: ExportOptions): Promise<void> {
  const { reportEl, title, nickname, avatarUrl, animeCount, gameCount } = opts;

  // Prepare assets in parallel
  const [qrDataUrl, avatarDataUrl] = await Promise.all([
    QRCode.toDataURL(SITE_URL, {
      width: 100, margin: 1,
      color: { dark: "#334155", light: "#ffffff" },
    }),
    avatarUrl ? toDataUrl(avatarUrl).catch(() => "") : Promise.resolve(""),
  ]);

  // Screenshot the VISIBLE report element directly via SVG foreignObject
  // (browser renders all CSS natively — no parsing of oklab/oklch needed)
  const reportCanvas = await toCanvas(reportEl, {
    pixelRatio: SCALE,
    backgroundColor: "transparent",
  });

  const rw = reportCanvas.width;
  const contentWidth = rw + PAD * 2;
  // Header: avatar/QR fill the row, 3 text lines beside avatar
  const iconSize = 64 * SCALE; // avatar & QR both this size
  const qrLabelH = 18 * SCALE; // space for "扫码尝试" below QR
  const headerH = iconSize + qrLabelH + 12 * SCALE; // icon + label + padding
  const totalH = PAD + headerH + reportCanvas.height + PAD;

  const canvas = document.createElement("canvas");
  canvas.width = contentWidth;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = PAD;
  const iconY = y + 8 * SCALE; // vertical padding within header
  let headerX = PAD;

  // ---- Left: avatar ----
  if (avatarDataUrl) {
    try {
      const avatarImg = await loadImg(avatarDataUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(headerX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, headerX, iconY, iconSize, iconSize);
      ctx.restore();
      headerX += iconSize + 14 * SCALE;
    } catch { /* skip */ }
  }

  // ---- 3 text lines beside avatar, vertically centered with icon ----
  // Line 1: "{nickname} 的"
  const line1Size = 16;
  const line2Size = 26;
  const line3Size = 12;
  const lineGap = 6;
  const totalTextH = (line1Size + line2Size + line3Size + lineGap * 2) * SCALE;
  const textStartY = iconY + (iconSize - totalTextH) / 2;

  ctx.fillStyle = "#6b7280";
  ctx.font = `${line1Size * SCALE}px system-ui, sans-serif`;
  ctx.fillText(`${nickname} 的`, headerX, textStartY + line1Size * SCALE);

  // Line 2: title (bold purple)
  ctx.fillStyle = "#6366f1";
  ctx.font = `bold ${line2Size * SCALE}px system-ui, sans-serif`;
  ctx.fillText(title, headerX, textStartY + (line1Size + lineGap + line2Size) * SCALE);

  // Line 3: stats
  const statsText = [
    animeCount ? `${animeCount} 部动画` : "",
    gameCount ? `${gameCount} 款游戏` : "",
  ].filter(Boolean).join(" · ");
  if (statsText) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `${line3Size * SCALE}px system-ui, sans-serif`;
    ctx.fillText(statsText, headerX, textStartY + totalTextH);
  }

  // ---- Right: QR code ----
  const qrX = contentWidth - PAD - iconSize;
  try {
    const qrImg = await loadImg(qrDataUrl);
    ctx.drawImage(qrImg, qrX, iconY, iconSize, iconSize);
  } catch { /* skip */ }

  // ---- "扫码尝试" centered below QR ----
  ctx.fillStyle = "#9ca3af";
  ctx.font = `${10 * SCALE}px system-ui, sans-serif`;
  const qrLabel = "扫码尝试";
  const qrLabelW = ctx.measureText(qrLabel).width;
  ctx.fillText(qrLabel, qrX + (iconSize - qrLabelW) / 2, iconY + iconSize + 14 * SCALE);

  // Header divider
  y += headerH;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = SCALE;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(contentWidth - PAD, y);
  ctx.stroke();
  y += 8 * SCALE;

  // ---- Report ----
  ctx.drawImage(reportCanvas, PAD, y);

  // ---- Download ----
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bangumi-${nickname}-${title}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, "image/png");
}
