import type { Collection, Message, TextBasedChannel } from "discord.js";
import PDFDocument from "pdfkit";

const MAX_MESSAGES = 500;
const FETCH_BATCH_SIZE = 100;

async function fetchAllMessages(channel: TextBasedChannel): Promise<Message[]> {
  const collected: Message[] = [];
  let beforeId: string | undefined;

  while (collected.length < MAX_MESSAGES) {
    const batch: Collection<string, Message> = await channel.messages.fetch({
      limit: FETCH_BATCH_SIZE,
      before: beforeId,
    });
    if (batch.size === 0) break;

    collected.push(...batch.values());
    beforeId = batch.last()?.id;
    if (batch.size < FETCH_BATCH_SIZE) break;
  }

  return collected.reverse();
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function generateHtmlTranscript(
  channel: TextBasedChannel,
  ticketNumber: number,
): Promise<Buffer> {
  const messages = await fetchAllMessages(channel);

  const rows = messages
    .map((message) => {
      const attachments = message.attachments
        .map(
          (attachment) =>
            `<div class="attachment"><a href="${attachment.url}">${escapeHtml(attachment.name)}</a></div>`,
        )
        .join("");

      return `
        <div class="message">
          <img class="avatar" src="${message.author.displayAvatarURL({ extension: "png", size: 64 })}" />
          <div class="content">
            <div class="meta"><span class="author">${escapeHtml(message.author.tag)}</span> <span class="time">${message.createdAt.toLocaleString("id-ID")}</span></div>
            <div class="text">${escapeHtml(message.content)}</div>
            ${attachments}
          </div>
        </div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Transkrip Tiket #${ticketNumber}</title>
<style>
  body { background: #111827; color: #e5e7eb; font-family: sans-serif; padding: 24px; }
  h1 { color: #ffffff; }
  .message { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #1f2937; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; }
  .meta { font-size: 13px; color: #9ca3af; margin-bottom: 4px; }
  .author { font-weight: 600; color: #ffffff; }
  .text { white-space: pre-wrap; word-break: break-word; }
  .attachment { font-size: 13px; margin-top: 4px; }
  .attachment a { color: #60a5fa; }
</style>
</head>
<body>
  <h1>Transkrip Tiket #${ticketNumber}</h1>
  <p>Diekspor pada ${new Date().toLocaleString("id-ID")} • ${messages.length} pesan</p>
  ${rows}
</body>
</html>`;

  return Buffer.from(html, "utf-8");
}

export async function generatePdfTranscript(
  channel: TextBasedChannel,
  ticketNumber: number,
): Promise<Buffer> {
  const messages = await fetchAllMessages(channel);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(`Transkrip Tiket #${ticketNumber}`, { align: "center" });
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(`Diekspor pada ${new Date().toLocaleString("id-ID")} • ${messages.length} pesan`, {
        align: "center",
      });
    doc.moveDown();

    for (const message of messages) {
      doc
        .fontSize(9)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text(`${message.author.tag} `, { continued: true })
        .font("Helvetica")
        .fillColor("#666")
        .text(message.createdAt.toLocaleString("id-ID"));

      if (message.content) {
        doc.fontSize(10).fillColor("#111").text(message.content);
      }

      for (const attachment of message.attachments.values()) {
        doc.fontSize(9).fillColor("#2563eb").text(`[Lampiran] ${attachment.name}`);
      }

      doc.moveDown(0.5);
    }

    doc.end();
  });
}
