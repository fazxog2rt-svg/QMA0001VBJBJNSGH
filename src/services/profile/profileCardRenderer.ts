import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import type { MemberDocument } from "../../database/models/Member";
import { BADGE_DEFINITIONS, totalXpForLevel, xpForLevel } from "../../config/constants";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 500;
const BANNER_HEIGHT = 170;
const AVATAR_SIZE = 140;
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export interface RenderProfileInput {
  member: MemberDocument;
  displayName: string;
  avatarUrl: string;
  joinedAt: Date | null;
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

function resolveAccentColor(favoriteColor: string | undefined): string {
  if (favoriteColor && HEX_COLOR_PATTERN.test(favoriteColor.trim())) {
    const hex = favoriteColor.trim();
    return hex.startsWith("#") ? hex : `#${hex}`;
  }
  return "#5865f2";
}

async function drawBanner(
  ctx: SKRSContext2D,
  bannerUrl: string | undefined,
  accentColor: string,
): Promise<void> {
  if (bannerUrl) {
    try {
      const image = await loadImage(bannerUrl);
      ctx.save();
      roundedRect(ctx, 0, 0, CANVAS_WIDTH, BANNER_HEIGHT, 0);
      ctx.clip();
      ctx.drawImage(image, 0, 0, CANVAS_WIDTH, BANNER_HEIGHT);
      ctx.restore();
      return;
    } catch {
      // fall through to gradient banner
    }
  }

  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, BANNER_HEIGHT);
  gradient.addColorStop(0, accentColor);
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, BANNER_HEIGHT);
}

async function drawAvatar(
  ctx: SKRSContext2D,
  avatarUrl: string,
  accentColor: string,
): Promise<void> {
  const x = 40;
  const y = BANNER_HEIGHT - AVATAR_SIZE / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x + AVATAR_SIZE / 2, y + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 6, 0, Math.PI * 2);
  ctx.fillStyle = "#1f2937";
  ctx.fill();
  ctx.restore();

  try {
    const image = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + AVATAR_SIZE / 2, y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(image, x, y, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();
  } catch {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + AVATAR_SIZE / 2, y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#374151";
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = accentColor;
  ctx.beginPath();
  ctx.arc(x + AVATAR_SIZE / 2, y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawXpBar(
  ctx: SKRSContext2D,
  member: MemberDocument,
  x: number,
  y: number,
  width: number,
): void {
  const xpIntoLevel = Math.max(0, member.xp - totalXpForLevel(member.level));
  const xpNeeded = xpForLevel(member.level);
  const progress = xpNeeded > 0 ? Math.min(1, xpIntoLevel / xpNeeded) : 0;

  ctx.font = "600 15px sans-serif";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(
    `Level ${member.level}${member.prestige > 0 ? ` • Prestige ${member.prestige}` : ""}`,
    x,
    y,
  );

  ctx.font = "400 13px sans-serif";
  ctx.fillStyle = "#9ca3af";
  const xpLabel = `${xpIntoLevel} / ${xpNeeded} XP`;
  const xpLabelWidth = ctx.measureText(xpLabel).width;
  ctx.fillText(xpLabel, x + width - xpLabelWidth, y);

  const barY = y + 12;
  const barHeight = 14;
  ctx.fillStyle = "#374151";
  roundedRect(ctx, x, barY, width, barHeight, 7);
  ctx.fill();

  if (progress > 0) {
    ctx.fillStyle = "#5865f2";
    roundedRect(ctx, x, barY, Math.max(barHeight, width * progress), barHeight, 7);
    ctx.fill();
  }
}

function drawStat(ctx: SKRSContext2D, label: string, value: string, x: number, y: number): void {
  ctx.font = "500 12px sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(label.toUpperCase(), x, y);

  ctx.font = "700 18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(value, x, y + 22);
}

export async function renderProfileCard({
  member,
  displayName,
  avatarUrl,
  joinedAt,
}: RenderProfileInput): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");
  const accentColor = resolveAccentColor(member.favoriteColor ?? undefined);

  ctx.fillStyle = "#111827";
  roundedRect(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 24);
  ctx.fill();
  ctx.save();
  roundedRect(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 24);
  ctx.clip();

  await drawBanner(ctx, member.bannerUrl ?? undefined, accentColor);
  await drawAvatar(ctx, avatarUrl, accentColor);

  const contentX = 40 + AVATAR_SIZE + 24;
  ctx.font = "700 26px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(displayName, contentX, BANNER_HEIGHT + 10);

  if (member.pronouns) {
    ctx.font = "400 14px sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(member.pronouns, contentX, BANNER_HEIGHT + 32);
  }

  const badgeY = BANNER_HEIGHT + 42;
  const badgeHeight = 24;
  let badgeX = contentX;
  ctx.font = "600 12px sans-serif";
  for (const badge of member.badges.slice(0, 8)) {
    const definition = BADGE_DEFINITIONS.find((entry) => entry.key === badge.key);
    if (!definition) continue;

    const label = definition.name.toUpperCase();
    const chipWidth = ctx.measureText(label).width + 20;

    ctx.fillStyle = accentColor;
    roundedRect(ctx, badgeX, badgeY, chipWidth, badgeHeight, badgeHeight / 2);
    ctx.fill();

    ctx.fillStyle = "#0b0b0f";
    ctx.fillText(label, badgeX + 10, badgeY + 16);

    badgeX += chipWidth + 8;
  }

  ctx.font = "400 15px sans-serif";
  ctx.fillStyle = "#d1d5db";
  const bio = member.bio ?? "_Belum ada bio._";
  wrapText(ctx, bio, 40, BANNER_HEIGHT + 90, CANVAS_WIDTH - 80, 20, 3);

  drawXpBar(ctx, member, 40, 330, CANVAS_WIDTH - 80);

  const statsY = 390;
  const statWidth = (CANVAS_WIDTH - 80) / 4;
  drawStat(ctx, "Reputasi", String(member.reputation), 40, statsY);
  drawStat(ctx, "Pesan", String(member.messageCount), 40 + statWidth, statsY);
  drawStat(ctx, "Voice", `${Math.floor(member.voiceMinutes / 60)} jam`, 40 + statWidth * 2, statsY);
  drawStat(ctx, "Daily Streak", `${member.dailyStreak} hari`, 40 + statWidth * 3, statsY);

  ctx.font = "400 13px sans-serif";
  ctx.fillStyle = "#6b7280";
  const joinedLabel = joinedAt
    ? `Bergabung sejak ${joinedAt.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}`
    : "";
  ctx.fillText(joinedLabel, 40, CANVAS_HEIGHT - 20);

  ctx.restore();
  return canvas.toBuffer("image/png");
}

function wrapText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
      lineCount += 1;
      if (lineCount >= maxLines) return;
    } else {
      line = testLine;
    }
  }

  if (line) ctx.fillText(line, x, currentY);
}
