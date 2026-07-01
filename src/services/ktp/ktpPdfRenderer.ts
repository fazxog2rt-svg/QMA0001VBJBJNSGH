import PDFDocument from "pdfkit";
import type { IdentityCardDocument } from "../../database/models/IdentityCard";
import { formatTanggalLahir } from "./ktpValidation";
import { buildVerificationPayload, renderQrCodeBuffer } from "./ktpCodeRenderer";

export interface RenderPdfInput {
  card: IdentityCardDocument;
  guildId: string;
  guildName: string;
  cardPngBuffer: Buffer;
}

const CARD_ASPECT_RATIO = 650 / 1050;

export async function renderIdentityCardPdf({
  card,
  guildId,
  guildName,
  cardPngBuffer,
}: RenderPdfInput): Promise<Buffer> {
  const qrBuffer = await renderQrCodeBuffer(buildVerificationPayload(card.nomorIdentitas, guildId));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(16).text("KARTU IDENTITAS KOMUNITAS", { align: "center" });
    doc.fontSize(10).fillColor("#555").text(guildName, { align: "center" });
    doc.moveDown();

    const imageWidth = Math.min(usableWidth, 420);
    const imageHeight = imageWidth * CARD_ASPECT_RATIO;
    const imageX = doc.page.margins.left + (usableWidth - imageWidth) / 2;
    doc.image(cardPngBuffer, imageX, doc.y, { width: imageWidth, height: imageHeight });
    doc.x = doc.page.margins.left;
    doc.y += imageHeight + 20;

    doc.fillColor("#000").fontSize(10);
    const rows: [string, string][] = [
      ["Nomor Identitas", card.nomorIdentitas],
      ["Nama", card.nama],
      ["NIK", card.nik],
      ["Tempat, Tgl Lahir", `${card.tempatLahir}, ${formatTanggalLahir(card.tanggalLahir)}`],
      ["Jenis Kelamin", card.jenisKelamin],
      ["Agama", card.agama],
      ["Status Perkawinan", card.statusPerkawinan],
      ["Pekerjaan", card.pekerjaan],
      [
        "Alamat",
        `${card.alamat}, Kec. ${card.kecamatan}, ${card.kabupaten}, ${card.provinsi} ${card.kodePos}`,
      ],
      ["Kewarganegaraan", card.kewarganegaraan],
      ["Status", card.status.toUpperCase()],
      ["Berlaku Hingga", formatTanggalLahir(card.validUntil)],
    ];

    for (const [label, value] of rows) {
      doc
        .font("Helvetica-Bold")
        .text(`${label}: `, doc.page.margins.left, doc.y, { continued: true, width: usableWidth })
        .font("Helvetica")
        .text(value);
    }

    doc.moveDown();
    const qrSize = 90;
    doc.image(qrBuffer, doc.page.margins.left, doc.y, { width: qrSize, height: qrSize });
    doc.x = doc.page.margins.left;
    doc.y += qrSize + 16;

    doc
      .fontSize(8)
      .fillColor("#888")
      .text(
        "Bukan dokumen resmi negara — kartu identitas komunitas Discord.",
        doc.page.margins.left,
        doc.y,
        {
          align: "center",
          width: usableWidth,
        },
      );

    doc.end();
  });
}
