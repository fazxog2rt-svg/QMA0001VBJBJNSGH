import bwipjs from "bwip-js";
import QRCode from "qrcode";

export function buildVerificationPayload(nomorIdentitas: string, guildId: string): string {
  return `KTP-VERIFY|${nomorIdentitas}|${guildId}`;
}

export async function renderQrCodeBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: "png",
    margin: 1,
    scale: 6,
    color: { dark: "#111827", light: "#ffffff" },
  });
}

export async function renderBarcodeBuffer(nomorIdentitas: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: nomorIdentitas,
    scale: 3,
    height: 12,
    includetext: false,
    backgroundcolor: "FFFFFF",
  });
}
