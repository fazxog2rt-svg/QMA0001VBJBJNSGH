import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { prisma } from "@nexusbot/database";
import type { Command } from "../../types/command";

function parseDuration(input: string): number | null {
  const match = /^(\d+)(m|h|d)$/i.exec(input.trim());
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return value * multiplier;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("gstart")
    .setDescription("Start a giveaway")
    .addStringOption((opt) => opt.setName("prize").setDescription("What are you giving away?").setRequired(true))
    .addStringOption((opt) => opt.setName("duration").setDescription("Duration, e.g. 30m, 2h, 1d").setRequired(true))
    .addIntegerOption((opt) => opt.setName("winners").setDescription("Number of winners").setMinValue(1).setMaxValue(20).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || !("send" in interaction.channel)) return;

    const prize = interaction.options.getString("prize", true);
    const durationInput = interaction.options.getString("duration", true);
    const winnerCount = interaction.options.getInteger("winners") ?? 1;

    const durationMs = parseDuration(durationInput);
    if (!durationMs) {
      await interaction.reply({ content: "Invalid duration. Use formats like `30m`, `2h`, or `1d`.", flags: MessageFlags.Ephemeral });
      return;
    }

    const endsAt = new Date(Date.now() + durationMs);

    const giveaway = await prisma.giveaway.create({
      data: {
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        prize,
        winnerCount,
        hostId: interaction.user.id,
        endsAt,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎉 Giveaway: ${prize}`)
      .setDescription(`Click the button below to enter!\nEnds <t:${Math.floor(endsAt.getTime() / 1000)}:R>\nWinners: **${winnerCount}**\nHosted by: ${interaction.user}`)
      .setColor(0xeb459e);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`giveaway:enter:${giveaway.id}`).setLabel("Enter Giveaway").setStyle(ButtonStyle.Success).setEmoji("🎉"),
    );

    const message = await interaction.channel.send({ embeds: [embed], components: [row] });
    await prisma.giveaway.update({ where: { id: giveaway.id }, data: { messageId: message.id } });

    await interaction.reply({ content: `Giveaway started for **${prize}**!`, flags: MessageFlags.Ephemeral });
  },
};

export default command;
