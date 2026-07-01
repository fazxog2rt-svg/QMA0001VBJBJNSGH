import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import QRCode from "qrcode";

const WIDTH = 1000;
const HEIGHT = 560;

export interface CardTheme {
  key: string;
  label: string;
  background: (ctx: SKRSContext2D) => void;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  panel: string;
}

function linearBg(colors: [string, string, ...string[]]) {
  return (ctx: SKRSContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    const step = 1 / (colors.length - 1);
    colors.forEach((color, i) => gradient.addColorStop(i * step, color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  };
}

/**
 * Theme registry: adding a new theme is a matter of pushing one entry here
 * (a background painter + a small palette) — no changes needed anywhere else
 * in the renderer. IDENTITY_CARD_THEMES in @nexusbot/shared lists the full
 * set of theme keys the platform intends to support; only the ones registered
 * here are currently renderable, the rest fall back to "default".
 */
export const CARD_THEMES: Record<string, CardTheme> = {
  default: {
    key: "default",
    label: "Default",
    background: linearBg(["#1f2937", "#111827"]),
    accent: "#5865F2",
    textPrimary: "#ffffff",
    textSecondary: "#9ca3af",
    panel: "rgba(255,255,255,0.06)",
  },
  aurora: {
    key: "aurora",
    label: "Aurora",
    background: linearBg(["#0f2027", "#2c5364", "#00c9a7"]),
    accent: "#00e6c3",
    textPrimary: "#ffffff",
    textSecondary: "#b7f5ea",
    panel: "rgba(255,255,255,0.08)",
  },
  midnight: {
    key: "midnight",
    label: "Midnight",
    background: linearBg(["#020617", "#1e1b4b", "#312e81"]),
    accent: "#818cf8",
    textPrimary: "#e0e7ff",
    textSecondary: "#a5b4fc",
    panel: "rgba(129,140,248,0.12)",
  },
};

export function resolveTheme(themeKey: string): CardTheme {
  return CARD_THEMES[themeKey] ?? CARD_THEMES.default;
}

function roundedRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  // Falls back to system default sans-serif if no bundled font files exist;
  // @napi-rs/canvas ships a built-in fallback so this never throws.
  fontsRegistered = true;
  try {
    GlobalFonts.registerFromPath(
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      "NexusSans-Bold",
    );
    GlobalFonts.registerFromPath(
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      "NexusSans",
    );
  } catch {
    // Fonts unavailable in this environment; canvas will use its default.
  }
}

export interface RenderCardInput {
  theme: string;
  fullName: string;
  roleLabel?: string | null;
  typeLabel: string;
  level: number;
  badges: string[];
  avatarUrl?: string | null;
  shareUrl: string;
  guildName: string;
  isVerified: boolean;
  uniqueCode: string;
}

export async function renderIdentityCard(input: RenderCardInput): Promise<Buffer> {
  ensureFonts();
  const theme = resolveTheme(input.theme);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  theme.background(ctx);

  // Decorative accent bar
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, WIDTH, 10);

  // Panel behind content
  ctx.fillStyle = theme.panel;
  roundedRect(ctx, 40, 60, WIDTH - 80, HEIGHT - 120, 24);
  ctx.fill();

  // Avatar
  const avatarSize = 180;
  const avatarX = 90;
  const avatarY = 110;
  try {
    if (input.avatarUrl) {
      const image = await loadImage(input.avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } else {
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } catch {
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Name + type/role
  const textX = avatarX + avatarSize + 40;
  ctx.fillStyle = theme.textPrimary;
  ctx.font = '600 44px "NexusSans-Bold", sans-serif';
  ctx.fillText(input.fullName, textX, 165);

  ctx.fillStyle = theme.accent;
  ctx.font = '600 24px "NexusSans-Bold", sans-serif';
  ctx.fillText(input.typeLabel.replace(/_/g, " "), textX, 205);

  if (input.roleLabel) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = '400 22px "NexusSans", sans-serif';
    ctx.fillText(input.roleLabel, textX, 240);
  }

  ctx.fillStyle = theme.textSecondary;
  ctx.font = '400 20px "NexusSans", sans-serif';
  ctx.fillText(input.guildName, textX, 275);

  // Verified badge
  if (input.isVerified) {
    ctx.fillStyle = theme.accent;
    roundedRect(ctx, textX, 290, 110, 32, 8);
    ctx.fill();
    ctx.fillStyle = "#0b0f19";
    ctx.font = '600 16px "NexusSans-Bold", sans-serif';
    ctx.fillText("VERIFIED", textX + 12, 312);
  }

  // Level
  ctx.fillStyle = theme.textPrimary;
  ctx.font = '600 28px "NexusSans-Bold", sans-serif';
  ctx.fillText(`Level ${input.level}`, avatarX, 340);

  // Badges row
  if (input.badges.length > 0) {
    ctx.font = '400 22px "NexusSans", sans-serif';
    ctx.fillStyle = theme.textSecondary;
    const badgeText = input.badges.slice(0, 8).join("   ");
    ctx.fillText(badgeText, avatarX, 400);
  }

  // Unique code footer
  ctx.fillStyle = theme.textSecondary;
  ctx.font = '400 16px "NexusSans", sans-serif';
  ctx.fillText(`ID: ${input.uniqueCode}`, avatarX, HEIGHT - 90);

  // QR code
  const qrSize = 160;
  const qrX = WIDTH - qrSize - 90;
  const qrY = HEIGHT / 2 - qrSize / 2;
  const qrDataUrl = await QRCode.toDataURL(input.shareUrl, {
    margin: 1,
    width: qrSize,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
  const qrImage = await loadImage(qrDataUrl);
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
  ctx.fill();
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  return canvas.encode("png");
}
