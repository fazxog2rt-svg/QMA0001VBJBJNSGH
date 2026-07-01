import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from "discord.js";
import type { Command } from "../../types/command";
import { RealtimeEvent } from "@nexusbot/shared";
import { publishRealtimeEvent } from "../../lib/redis";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete recent messages in this channel")
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Number of messages to delete (1-100)").setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addUserOption((opt) => opt.setName("target").setDescription("Only delete messages from this user").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "This command can only be used in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    const amount = interaction.options.getInteger("amount", true);
    const target = interaction.options.getUser("target");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const messages = await interaction.channel.messages.fetch({ limit: amount });
    const toDelete = target ? messages.filter((m) => m.author.id === target.id) : messages;

    const deleted = await interaction.channel.bulkDelete(toDelete, true).catch(() => null);
    const count = deleted?.size ?? 0;

    await publishRealtimeEvent(RealtimeEvent.AuditLog, interaction.guild.id, {
      type: "purge",
      channelId: interaction.channel.id,
      moderatorId: interaction.user.id,
      count,
      targetId: target?.id ?? null,
    });

    await interaction.editReply(`Deleted ${count} message(s)${target ? ` from ${target.tag}` : ""}.`);
  },
};

export default command;
