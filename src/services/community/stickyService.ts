import { type Message, type GuildTextBasedChannel } from "discord.js";
import { StickyMessage } from "../../database/models/StickyMessage";
import { buildEmbed } from "../../utils/embed";

// Anti-spam: jangan repost sticky lebih sering dari interval ini per channel.
const REPOST_DEBOUNCE_MS = 4000;
const lastRepost = new Map<string, number>();

/**
 * Jika channel punya sticky message, hapus sticky lama dan kirim ulang di paling
 * bawah agar selalu terlihat. Dipanggil dari messageCreate.
 */
export async function handleStickyMessage(message: Message<true>): Promise<void> {
  const sticky = await StickyMessage.findOne({
    guildId: message.guildId,
    channelId: message.channelId,
  });
  if (!sticky) return;

  const now = Date.now();
  const last = lastRepost.get(message.channelId) ?? 0;
  if (now - last < REPOST_DEBOUNCE_MS) return;
  lastRepost.set(message.channelId, now);

  const channel = message.channel as GuildTextBasedChannel;

  if (sticky.lastMessageId) {
    await channel.messages
      .fetch(sticky.lastMessageId)
      .then((old) => old.delete())
      .catch(() => undefined);
  }

  const sent = await channel
    .send({
      embeds: [buildEmbed("primary").setTitle("📌 Pesan Tersemat").setDescription(sticky.content)],
    })
    .catch(() => null);

  if (sent) {
    sticky.lastMessageId = sent.id;
    await sticky.save();
  }
}
