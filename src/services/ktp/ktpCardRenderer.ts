import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import type { IdentityCardDocument } from "../../database/models/IdentityCard";
import { formatTanggalLahir } from "./ktpValidation";
import {
  renderBarcodeBuffer,
  renderQrCodeBuffer,
  buildVerificationPayload,
} from "./ktpCodeRenderer";

const CARD_WIDTH = 1050;
const CARD_HEIGHT = 650;
const PADDING = 40;

export interface RenderCardInput {
  card: IdentityCardDocument;
  guildId: string;
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

async function drawPhoto(
  ctx: SKRSContext2D,
  photoUrl: string,
  x: number,
  y: number,
  size: number,
): Promise<void> {
  try {
    const image = await loadImage(photoUrl);
    ctx.save();
    roundedRect(ctx, x, y, size, size, 16);
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
  } catch {
    ctx.fillStyle = "#374151";
    roundedRect(ctx, x, y, size, size, 16);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, size, size, 16);
  ctx.stroke();
}

function drawField(ctx: SKRSContext2D, label: string, value: string, x: number, y: number): number {
  ctx.font = "600 15px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(label.toUpperCase(), x, y);

  ctx.font = "600 21px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(value, x, y + 26);

  return y + 60;
}

export async function renderIdentityCardPng({
  card,
  guildId,
  guildName,
}: RenderCardInput): Promise<Buffer> {
  const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, "#1e1b4b");
  background.addColorStop(1, "#4c1d95");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 4;
  roundedRect(ctx, 8, 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, 28);
  ctx.stroke();

  ctx.font = "700 26px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("KARTU IDENTITAS KOMUNITAS", PADDING, 68);

  ctx.font = "500 16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(guildName.toUpperCase(), PADDING, 92);

  const statusColors: Record<string, string> = {
    verified: "#22c55e",
    pending: "#eab308",
    rejected: "#ef4444",
    expired: "#6b7280",
  };
  const statusLabels: Record<string, string> = {
    verified: "TERVERIFIKASI",
    pending: "MENUNGGU VERIFIKASI",
    rejected: "DITOLAK",
    expired: "KEDALUWARSA",
  };
  const statusColor = statusColors[card.status] ?? "#6b7280";
  const statusLabel = statusLabels[card.status] ?? card.status.toUpperCase();

  ctx.font = "700 14px sans-serif";
  const badgeWidth = ctx.measureText(statusLabel).width + 32;
  const badgeX = CARD_WIDTH - PADDING - badgeWidth;
  ctx.fillStyle = statusColor;
  roundedRect(ctx, badgeX, 40, badgeWidth, 30, 15);
  ctx.fill();
  ctx.fillStyle = "#0b0b0f";
  ctx.fillText(statusLabel, badgeX + 16, 60);

  const photoSize = 190;
  await drawPhoto(ctx, card.photoUrl ?? "", PADDING, 130, photoSize);

  let cursorY = 150;
  const textX = PADDING + photoSize + 36;

  cursorY = drawField(ctx, "Nomor Identitas", card.nomorIdentitas, textX, cursorY);
  cursorY = drawField(ctx, "Nama", card.nama, textX, cursorY);

  const col2X = textX + 320;
  let col2Y = 150;
  col2Y = drawField(ctx, "NIK", card.nik, col2X, col2Y);
  col2Y = drawField(
    ctx,
    "Tempat, Tgl Lahir",
    `${card.tempatLahir}, ${formatTanggalLahir(card.tanggalLahir)}`,
    col2X,
    col2Y,
  );

  cursorY = drawField(ctx, "Jenis Kelamin", card.jenisKelamin, textX, cursorY);
  cursorY = drawField(ctx, "Agama", card.agama, textX, cursorY);

  col2Y = drawField(ctx, "Status Perkawinan", card.statusPerkawinan, col2X, col2Y);
  drawField(ctx, "Pekerjaan", card.pekerjaan, col2X, col2Y);

  const alamatLine = `${card.alamat}, Kec. ${card.kecamatan}, ${card.kabupaten}, ${card.provinsi} ${card.kodePos}`;
  ctx.font = "600 15px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("ALAMAT", textX, cursorY);
  ctx.font = "500 17px sans-serif";
  ctx.fillStyle = "#ffffff";
  wrapText(ctx, alamatLine, textX, cursorY + 24, 560, 22);

  cursorY = drawField(ctx, "Kewarganegaraan", card.kewarganegaraan, textX, cursorY + 60);

  const qrPayload = buildVerificationPayload(card.nomorIdentitas, guildId);
  const [qrBuffer, barcodeBuffer] = await Promise.all([
    renderQrCodeBuffer(qrPayload),
    renderBarcodeBuffer(card.nomorIdentitas),
  ]);

  const qrImage = await loadImage(qrBuffer);
  const qrSize = 110;
  ctx.drawImage(
    qrImage,
    CARD_WIDTH - PADDING - qrSize,
    CARD_HEIGHT - PADDING - qrSize - 20,
    qrSize,
    qrSize,
  );

  const barcodeImage = await loadImage(barcodeBuffer);
  const barcodeWidth = 320;
  const barcodeHeight = 60;
  ctx.drawImage(
    barcodeImage,
    PADDING,
    CARD_HEIGHT - PADDING - barcodeHeight,
    barcodeWidth,
    barcodeHeight,
  );

  ctx.font = "400 12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText(
    "Bukan dokumen resmi negara — kartu identitas komunitas Discord.",
    PADDING,
    CARD_HEIGHT - 14,
  );

  return canvas.toBuffer("image/png");
}

function wrapText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) ctx.fillText(line, x, currentY);
}
