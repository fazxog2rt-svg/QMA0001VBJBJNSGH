import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Client } from "discord.js";
import { Giveaway, type GiveawayDocument } from "../../database/models/Giveaway";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../logger.service";

export function buildGiveawayEmbed(giveaway: GiveawayDocument) {
  const unix = Math.floor(giveaway.endsAt.getTime() / 1000);

  if (giveaway.ended) {
    return buildEmbed("premium")
      .setTitle(`🎉 GIVEAWAY BERAKHIR: ${giveaway.prize}`)
      .setDescription(
        giveaway.winnerIds.length > 0
          ? `Pemenang: ${giveaway.winnerIds.map((id) => `<@${id}>`).join(", ")}`
          : "Tidak ada peserta yang cukup.",
      );
  }

  return buildEmbed("premium")
    .setTitle(`🎉 GIVEAWAY: ${giveaway.prize}`)
    .setDescription(
      `Klik tombol 🎉 untuk ikut!\nBerakhir <t:${unix}:R> (<t:${unix}:F>)\nJumlah pemenang: **${giveaway.winnerCount}**`,
    )
    .setFooter({ text: `${giveaway.entrantIds.length} peserta` });
}

export function buildGiveawayComponents(
  giveawayId: string,
  ended: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  if (ended) return [];
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway:enter:${giveawayId}`)
        .setLabel("Ikut Giveaway")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

function pickWinners(entrantIds: string[], count: number): string[] {
  const pool = [...entrantIds];
  const winners: string[] = [];
  while (winners.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]!);
  }
  return winners;
}

export async function endGiveaway(client: Client, giveaway: GiveawayDocument): Promise<void> {
  giveaway.winnerIds = pickWinners(giveaway.entrantIds, giveaway.winnerCount);
  giveaway.ended = true;
  await (giveaway as GiveawayDocument & { save: () => Promise<unknown> }).save();

  try {
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel?.isTextBased() || !("messages" in channel)) return;

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    await message
      ?.edit({ embeds: [buildGiveawayEmbed(giveaway)], components: [] })
      .catch(() => undefined);

    if ("send" in channel) {
      const announcement =
        giveaway.winnerIds.length > 0
          ? `🎉 Selamat kepada ${giveaway.winnerIds.map((id) => `<@${id}>`).join(", ")}! Kalian memenangkan **${giveaway.prize}**!`
          : `Giveaway **${giveaway.prize}** berakhir tanpa pemenang (peserta tidak cukup).`;
      await channel.send({ content: announcement }).catch(() => undefined);
    }
  } catch (error) {
    logger.warn("Gagal menyelesaikan giveaway", {
      error: error instanceof Error ? error.message : error,
    });
  }
}

export async function processDueGiveaways(client: Client): Promise<void> {
  const due = await Giveaway.find({ ended: false, endsAt: { $lte: new Date() } });
  for (const giveaway of due) {
    await endGiveaway(client, giveaway);
  }
}
