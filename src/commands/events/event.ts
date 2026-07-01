import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { CommunityEvent } from "../../database/models/CommunityEvent";
import { BADGE_DEFINITIONS, type BadgeKey } from "../../config/constants";
import { grantBadge } from "../../services/profile/profileService";
import { parseDurationMs } from "../../services/community/timeParser";
import {
  buildEventComponents,
  buildEventEmbed,
  countRsvp,
} from "../../services/events/eventService";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Kelola event komunitas.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buat")
        .setDescription("[Admin] Buat event baru.")
        .addStringOption((option) =>
          option
            .setName("judul")
            .setDescription("Judul event.")
            .setRequired(true)
            .setMaxLength(100),
        )
        .addStringOption((option) =>
          option
            .setName("mulai-dalam")
            .setDescription("Mulai dalam, mis. 2h, 1d, 3d12h.")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("deskripsi").setDescription("Deskripsi event.").setMaxLength(1000),
        )
        .addStringOption((option) =>
          option
            .setName("badge-hadiah")
            .setDescription("Badge untuk peserta yang hadir.")
            .addChoices(
              ...BADGE_DEFINITIONS.map((badge) => ({
                name: `${badge.emoji} ${badge.name}`,
                value: badge.key,
              })),
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("selesai")
        .setDescription("[Admin] Tandai event selesai, catat kehadiran, & undi lucky draw.")
        .addStringOption((option) =>
          option.setName("id").setDescription("ID event.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Lihat event yang akan datang."),
    ),
  category: "events",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild || !interaction.channel?.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const hasManageEvents =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents) ?? false;

    if (subcommand === "buat") {
      if (!hasManageEvents) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu butuh izin **Manage Events**.")],
          ephemeral: true,
        });
        return;
      }

      const judul = interaction.options.getString("judul", true);
      const mulaiDalam = interaction.options.getString("mulai-dalam", true);
      const deskripsi = interaction.options.getString("deskripsi") ?? "";
      const badgeReward = interaction.options.getString("badge-hadiah") ?? undefined;

      const offsetMs = parseDurationMs(mulaiDalam);
      if (!offsetMs || offsetMs <= 0) {
        await interaction.reply({
          embeds: [errorEmbed("Format waktu tidak valid. Contoh: `2h`, `1d`, `3d12h`.")],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const event = await CommunityEvent.create({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        title: judul,
        description: deskripsi,
        createdBy: interaction.user.id,
        startsAt: new Date(Date.now() + offsetMs),
        badgeReward,
      });

      const message = await interaction.channel.send({
        embeds: [buildEventEmbed(event)],
        components: buildEventComponents(event._id.toString(), false),
      });

      event.messageId = message.id;
      await event.save();

      await interaction.editReply({
        embeds: [successEmbed(`Event dibuat! ID: \`${event._id.toString()}\``)],
      });
      return;
    }

    if (subcommand === "selesai") {
      if (!hasManageEvents) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu butuh izin **Manage Events**.")],
          ephemeral: true,
        });
        return;
      }

      const id = interaction.options.getString("id", true);
      const event = await CommunityEvent.findOne({ _id: id, guildId: interaction.guildId }).catch(
        () => null,
      );

      if (!event) {
        await interaction.reply({
          embeds: [errorEmbed("Event tidak ditemukan.")],
          ephemeral: true,
        });
        return;
      }
      if (event.completed) {
        await interaction.reply({
          embeds: [errorEmbed("Event ini sudah selesai.")],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      // Attendance = everyone who RSVP'd "going".
      const attendees = event.rsvp
        .filter((entry) => entry.status === "going")
        .map((entry) => entry.userId);
      event.attendanceUserIds = attendees;
      event.completed = true;

      // Lucky draw among attendees.
      let luckyDrawWinnerId: string | undefined;
      if (attendees.length > 0) {
        luckyDrawWinnerId = attendees[Math.floor(Math.random() * attendees.length)]!;
        event.luckyDrawWinnerId = luckyDrawWinnerId;
      }

      // Award the event badge to all attendees.
      if (event.badgeReward) {
        for (const userId of attendees) {
          await grantBadge(
            interaction.guildId,
            userId,
            event.badgeReward as BadgeKey,
            interaction.user.id,
          );
        }
      }

      await event.save();

      const resultEmbed = buildEmbed("premium")
        .setTitle(`🎉 Event Selesai: ${event.title}`)
        .setDescription(
          `Kehadiran: **${attendees.length} member**${event.badgeReward ? ` (badge dibagikan)` : ""}\n${
            luckyDrawWinnerId
              ? `🎁 Pemenang lucky draw: <@${luckyDrawWinnerId}>`
              : "Tidak ada peserta untuk lucky draw."
          }`,
        );

      await interaction.editReply({ embeds: [resultEmbed] });

      // Update the original event message to a completed state.
      if (event.messageId) {
        const originalChannel = interaction.guild.channels.cache.get(event.channelId);
        if (originalChannel?.isTextBased()) {
          const originalMessage = await originalChannel.messages
            .fetch(event.messageId)
            .catch(() => null);
          await originalMessage
            ?.edit({ embeds: [buildEventEmbed(event)], components: [] })
            .catch(() => undefined);
        }
      }
      return;
    }

    // list
    await interaction.deferReply();
    const events = await CommunityEvent.find({ guildId: interaction.guildId, completed: false })
      .sort({ startsAt: 1 })
      .limit(10);

    if (events.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed("Belum ada event yang akan datang.")] });
      return;
    }

    const lines = events.map((event) => {
      const unix = Math.floor(event.startsAt.getTime() / 1000);
      return `**${event.title}** — <t:${unix}:R> • ${countRsvp(event, "going")} hadir\n\`${event._id.toString()}\``;
    });

    await interaction.editReply({
      embeds: [
        buildEmbed("primary").setTitle("📅 Event Mendatang").setDescription(lines.join("\n\n")),
      ],
    });
  },
};

export default command;
