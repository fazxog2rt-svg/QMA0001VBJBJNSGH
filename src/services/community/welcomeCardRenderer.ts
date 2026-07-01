import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 350;
const AVATAR_SIZE = 150;

export interface RenderWelcomeCardInput {
  kind: "welcome" | "goodbye";
  username: string;
  avatarUrl: string;
  memberCount: number;
  guildName: string;
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

export async function renderWelcomeCard({
  kind,
  username,
  avatarUrl,
  memberCount,
  guildName,
}: RenderWelcomeCardInput): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (kind === "welcome") {
    gradient.addColorStop(0, "#065f46");
    gradient.addColorStop(1, "#111827");
  } else {
    gradient.addColorStop(0, "#7f1d1d");
    gradient.addColorStop(1, "#111827");
  }
  ctx.fillStyle = gradient;
  roundedRect(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 24);
  ctx.fill();

  const avatarX = (CANVAS_WIDTH - AVATAR_SIZE) / 2;
  const avatarY = 40;

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

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarX + AVATAR_SIZE / 2, avatarY + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";

  ctx.font = "700 30px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    kind === "welcome" ? "SELAMAT DATANG!" : "SAMPAI JUMPA!",
    CANVAS_WIDTH / 2,
    avatarY + AVATAR_SIZE + 45,
  );

  ctx.font = "600 24px sans-serif";
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(username, CANVAS_WIDTH / 2, avatarY + AVATAR_SIZE + 80);

  ctx.font = "400 16px sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(
    kind === "welcome"
      ? `Member ke-${memberCount} di ${guildName}`
      : `Sekarang ada ${memberCount} member di ${guildName}`,
    CANVAS_WIDTH / 2,
    avatarY + AVATAR_SIZE + 108,
  );

  ctx.textAlign = "left";
  return canvas.toBuffer("image/png");
}
