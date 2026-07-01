import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { totalXpForLevel, xpForLevel } from "../../config/constants";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 260;
const AVATAR_SIZE = 160;

export interface RenderRankCardInput {
  displayName: string;
  avatarUrl: string;
  level: number;
  xp: number;
  prestige: number;
  rank: number;
}

function roundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export async function renderRankCard({
  displayName,
  avatarUrl,
  level,
  xp,
  prestige,
  rank,
}: RenderRankCardInput): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  background.addColorStop(0, "#111827");
  background.addColorStop(1, "#1f2937");
  ctx.fillStyle = background;
  roundedRect(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 24);
  ctx.fill();

  const avatarX = 50;
  const avatarY = (CANVAS_HEIGHT - AVATAR_SIZE) / 2;

  try {
    const image = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, avatarX, avatarY, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();
  } catch {
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#5865f2";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.stroke();

  const contentX = avatarX + AVATAR_SIZE + 40;

  ctx.font = "700 32px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(displayName, contentX, 70);

  ctx.font = "600 20px sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(`RANK #${rank}`, contentX, 100);

  const rightLabelY = 70;
  ctx.font = "700 22px sans-serif";
  ctx.fillStyle = "#5865f2";
  const levelLabel = prestige > 0 ? `LEVEL ${level} • PRESTIGE ${prestige}` : `LEVEL ${level}`;
  const levelLabelWidth = ctx.measureText(levelLabel).width;
  ctx.fillText(levelLabel, CANVAS_WIDTH - 50 - levelLabelWidth, rightLabelY);

  const xpIntoLevel = Math.max(0, xp - totalXpForLevel(level));
  const xpNeeded = xpForLevel(level);
  const progress = xpNeeded > 0 ? Math.min(1, xpIntoLevel / xpNeeded) : 0;

  const barX = contentX;
  const barY = 150;
  const barWidth = CANVAS_WIDTH - contentX - 50;
  const barHeight = 26;

  ctx.fillStyle = "#374151";
  roundedRect(ctx, barX, barY, barWidth, barHeight, 13);
  ctx.fill();

  if (progress > 0) {
    ctx.fillStyle = "#5865f2";
    roundedRect(ctx, barX, barY, Math.max(barHeight, barWidth * progress), barHeight, 13);
    ctx.fill();
  }

  ctx.font = "600 14px sans-serif";
  ctx.fillStyle = "#ffffff";
  const xpLabel = `${xpIntoLevel} / ${xpNeeded} XP`;
  const xpLabelWidth = ctx.measureText(xpLabel).width;
  ctx.fillText(xpLabel, barX + (barWidth - xpLabelWidth) / 2, barY + 18);

  return canvas.toBuffer("image/png");
}
