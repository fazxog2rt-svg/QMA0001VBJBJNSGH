import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { GuildConfig } from "../../database/models/GuildConfig";
import { Ticket } from "../../database/models/Ticket";
import {
  generateHtmlTranscript,
  generatePdfTranscript,
} from "../../services/tickets/transcriptService";
import { askConfirmation } from "../../utils/confirm";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";

const component: ButtonComponent = {
  customId: "ticket:close",
  execute: async (interaction) => {
    if (
      !interaction.inGuild() ||
      !interaction.guild ||
      interaction.channel?.type !== ChannelType.GuildText
    )
      return;

    const ticket = await Ticket.findOne({
      channelId: interaction.channelId,
      status: { $in: ["open", "claimed", "reopened"] },
    });
    if (!ticket) {
      await interaction.reply({
        embeds: [errorEmbed("Tiket ini sudah ditutup.")],
        ephemeral: true,
      });
      return;
    }

    const guildConfigForPermission = await GuildConfig.findOne({ guildId: interaction.guildId });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const isSupport = guildConfigForPermission?.tickets?.supportRoleIds.some((roleId) =>
      member.roles.cache.has(roleId),
    );
    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
    const isOpener = ticket.openedBy === interaction.user.id;

    if (!isSupport && !hasManageGuild && !isOpener) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak punya izin menutup tiket ini.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const confirmed = await askConfirmation(
      interaction,
      "Yakin ingin menutup tiket ini? Channel akan dikunci dan transkrip akan dibuat.",
    );
    if (confirmed !== true) {
      await interaction.editReply({
        embeds: [errorEmbed("Penutupan tiket dibatalkan.")],
        components: [],
      });
      return;
    }

    try {
      const [htmlBuffer, pdfBuffer] = await Promise.all([
        generateHtmlTranscript(interaction.channel, ticket.ticketNumber),
        generatePdfTranscript(interaction.channel, ticket.ticketNumber),
      ]);

      await interaction.channel.permissionOverwrites
        .edit(ticket.openedBy, { SendMessages: false })
        .catch(() => undefined);

      ticket.status = "closed";
      ticket.closedBy = interaction.user.id;
      ticket.closedAt = new Date();
      await ticket.save();

      const guildConfig = await GuildConfig.findOne({ guildId: interaction.guildId });
      const logChannelId = guildConfig?.tickets?.logChannelId;
      const htmlAttachment = new AttachmentBuilder(htmlBuffer, {
        name: `transkrip-tiket-${ticket.ticketNumber}.html`,
      });
      const pdfAttachment = new AttachmentBuilder(pdfBuffer, {
        name: `transkrip-tiket-${ticket.ticketNumber}.pdf`,
      });

      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel?.isTextBased()) {
          const logMessage = await logChannel.send({
            embeds: [
              buildEmbed("info")
                .setTitle(`🔒 Tiket #${ticket.ticketNumber} ditutup`)
                .setDescription(
                  `Ditutup oleh ${interaction.user} • Dibuka oleh <@${ticket.openedBy}>`,
                ),
            ],
            files: [htmlAttachment, pdfAttachment],
          });

          const htmlUrl = logMessage.attachments.find((attachment) =>
            attachment.name.endsWith(".html"),
          )?.url;
          const pdfUrl = logMessage.attachments.find((attachment) =>
            attachment.name.endsWith(".pdf"),
          )?.url;
          if (htmlUrl) ticket.transcriptHtmlUrl = htmlUrl;
          if (pdfUrl) ticket.transcriptPdfUrl = pdfUrl;
          await ticket.save();
        }
      }

      const reopenRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket:reopen")
          .setLabel("Buka Kembali")
          .setEmoji("🔓")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("ticket:delete")
          .setLabel("Hapus Channel")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger),
      );

      await interaction.channel.send({
        embeds: [
          buildEmbed("warning").setDescription(
            `🔒 Tiket ditutup oleh ${interaction.user}. Tim support bisa membuka kembali atau menghapus channel ini.`,
          ),
        ],
        components: [reopenRow],
      });

      await interaction.editReply({
        embeds: [successEmbed("Tiket berhasil ditutup.")],
        components: [],
      });

      const opener = await interaction.guild.members.fetch(ticket.openedBy).catch(() => null);
      if (opener) {
        const ratingSelect = new StringSelectMenuBuilder()
          .setCustomId(`ticket:rating:${ticket._id.toString()}`)
          .setPlaceholder("Beri rating layanan tiket")
          .addOptions(
            { label: "⭐ 1 - Buruk", value: "1" },
            { label: "⭐⭐ 2 - Kurang", value: "2" },
            { label: "⭐⭐⭐ 3 - Cukup", value: "3" },
            { label: "⭐⭐⭐⭐ 4 - Baik", value: "4" },
            { label: "⭐⭐⭐⭐⭐ 5 - Sangat Baik", value: "5" },
          );

        await opener
          .send({
            embeds: [
              buildEmbed("primary").setDescription(
                `Tiket #${ticket.ticketNumber} di **${interaction.guild.name}** telah ditutup. Beri rating untuk layanan yang kamu terima:`,
              ),
            ],
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(ratingSelect),
            ],
          })
          .catch(() => undefined);
      }
    } catch (error) {
      logger.error("Gagal menutup tiket", {
        error: error instanceof Error ? error.message : error,
      });
      await interaction.editReply({
        embeds: [errorEmbed("Gagal menutup tiket. Coba lagi.")],
        components: [],
      });
    }
  },
};

export default component;
