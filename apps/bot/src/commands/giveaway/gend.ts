import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { prisma } from "@nexusbot/database";
import { RealtimeEvent } from "@nexusbot/shared";
import type { Command } from "../../types/command";
import { publishRealtimeEvent } from "../../lib/redis";

function pickWinners(entries: string[], count: number): string[] {
  const pool = [...entries];
  const winners: string[] = [];
  while (pool.length > 0 && winners.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("gend")
    .setDescription("End a giveaway early and pick winners now")
    .addStringOption((opt) => opt.setName("message_id").setDescription("The giveaway message ID").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const messageId = interaction.options.getString("message_id", true);

    const giveaway = await prisma.giveaway.findFirst({
      where: { guildId: interaction.guild.id, messageId, endedAt: null },
      include: { entries: true },
    });

    if (!giveaway) {
      await interaction.reply({ content: "No active giveaway found with that message ID.", flags: MessageFlags.Ephemeral });
      return;
    }

    const winners = pickWinners(giveaway.entries.map((e) => e.userId), giveaway.winnerCount);
    await prisma.giveaway.update({ where: { id: giveaway.id }, data: { endedAt: new Date() } });

    const channel = await interaction.guild.channels.fetch(giveaway.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      const text =
        winners.length > 0
          ? `The giveaway for **${giveaway.prize}** has ended! Congratulations ${winners.map((id) => `<@${id}>`).join(", ")}!`
          : `The giveaway for **${giveaway.prize}** has ended, but nobody entered.`;
      await channel.send({ content: text });
    }

    await publishRealtimeEvent(RealtimeEvent.GiveawayEnded, giveaway.guildId, {
      giveawayId: giveaway.id,
      prize: giveaway.prize,
      winners,
    });

    await interaction.reply({ content: `Giveaway ended. Winners: ${winners.length > 0 ? winners.map((id) => `<@${id}>`).join(", ") : "none"}.`, flags: MessageFlags.Ephemeral });
  },
};

export default command;
