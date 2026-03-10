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
  const headerH = 80 * SCALE;
  const footerH = 90 * SCALE;
  const totalH = PAD + headerH + reportCanvas.height + footerH + PAD;

  // Compose final image
  const canvas = document.createElement("canvas");
  canvas.width = contentWidth;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = PAD;

  // ---- Header ----
  const avatarSize = 48 * SCALE;
  let headerX = PAD;

  if (avatarDataUrl) {
    try {
      const avatarImg = await loadImg(avatarDataUrl);
      // Draw circular avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(headerX + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, headerX, y, avatarSize, avatarSize);
      ctx.restore();
      headerX += avatarSize + 16 * SCALE;
    } catch { /* skip */ }
  }

  // "{nickname} 的"
  ctx.fillStyle = "#6b7280";
  ctx.font = `${14 * SCALE}px system-ui, sans-serif`;
  ctx.fillText(`${nickname} 的`, headerX, y + 20 * SCALE);

  // Title
  ctx.fillStyle = "#6366f1";
  ctx.font = `bold ${22 * SCALE}px system-ui, sans-serif`;
  ctx.fillText(title, headerX, y + 48 * SCALE);

  // Stats (right aligned)
  const statsText = [
    animeCount ? `${animeCount} 部动画` : "",
    gameCount ? `${gameCount} 款游戏` : "",
  ].filter(Boolean).join(" · ");
  if (statsText) {
    ctx.fillStyle = "#64748b";
    ctx.font = `${12 * SCALE}px system-ui, sans-serif`;
    const tw = ctx.measureText(statsText).width;
    ctx.fillText(statsText, contentWidth - PAD - tw, y + 30 * SCALE);
  }

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
  y += reportCanvas.height + 8 * SCALE;

  // Footer divider
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(contentWidth - PAD, y);
  ctx.stroke();
  y += 16 * SCALE;

  // ---- Footer left ----
  let fx = PAD;
  const footerAvatarSize = 32 * SCALE;
  if (avatarDataUrl) {
    try {
      const avatarImg = await loadImg(avatarDataUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(fx + footerAvatarSize / 2, y + footerAvatarSize / 2, footerAvatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, fx, y, footerAvatarSize, footerAvatarSize);
      ctx.restore();
      fx += footerAvatarSize + 10 * SCALE;
    } catch { /* skip */ }
  }

  ctx.fillStyle = "#1a1a2e";
  ctx.font = `600 ${13 * SCALE}px system-ui, sans-serif`;
  ctx.fillText(`由 ${nickname} 生成`, fx, y + 14 * SCALE);

  ctx.fillStyle = "#6b7280";
  ctx.font = `${11 * SCALE}px system-ui, sans-serif`;
  ctx.fillText("Powered by Bangumi 品味分析器", fx, y + 32 * SCALE);

  // ---- Footer right (QR) ----
  const qrSize = 64 * SCALE;
  const qrX = contentWidth - PAD - qrSize;
  const qrY = y - 4 * SCALE;
  try {
    const qrImg = await loadImg(qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch { /* skip */ }

  // Text left of QR
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 ${12 * SCALE}px system-ui, sans-serif`;
  const promoText = "扫码生成你的品味报告";
  const promoW = ctx.measureText(promoText).width;
  ctx.fillText(promoText, qrX - promoW - 12 * SCALE, qrY + 24 * SCALE);

  ctx.fillStyle = "#9ca3af";
  ctx.font = `${10 * SCALE}px system-ui, sans-serif`;
  const subText = "bangumi-taste";
  const subW = ctx.measureText(subText).width;
  ctx.fillText(subText, qrX - subW - 12 * SCALE, qrY + 44 * SCALE);

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
