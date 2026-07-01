import { AttachmentBuilder } from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { clearDraft, getDraft } from "../../services/ktp/ktpSession";
import { isDraftComplete } from "../../services/ktp/ktpDraftEmbed";
import { renderCardAssets, upsertIdentityCard } from "../../services/ktp/ktpService";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { ActivityLog } from "../../database/models";
import { logger } from "../../services/logger.service";

const component: ButtonComponent = {
  customId: "ktp:finalize",
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) return;

    const draft = await getDraft(interaction.guildId, interaction.user.id);

    if (!draft || !isDraftComplete(draft)) {
      await interaction.reply({
        embeds: [
          errorEmbed("Masih ada data yang belum lengkap. Lengkapi dulu sebelum membuat kartu."),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.update({
      embeds: [
        buildEmbed("info").setDescription("⏳ Sedang membuat kartu identitas digital kamu..."),
      ],
      components: [],
    });

    try {
      const photoUrl =
        draft.photoUrl ?? interaction.user.displayAvatarURL({ size: 512, extension: "png" });

      const card = await upsertIdentityCard(interaction.guildId, interaction.user.id, {
        nama: draft.nama!,
        nik: draft.nik!,
        tempatLahir: draft.tempatLahir!,
        tanggalLahirIso: draft.tanggalLahirIso!,
        pekerjaan: draft.pekerjaan!,
        alamat: draft.alamat!,
        kecamatan: draft.kecamatan!,
        kabupaten: draft.kabupaten!,
        provinsi: draft.provinsi!,
        kodePos: draft.kodePos!,
        jenisKelamin: draft.jenisKelamin!,
        agama: draft.agama!,
        statusPerkawinan: draft.statusPerkawinan!,
        photoUrl,
      });

      const { pngBuffer, pdfBuffer } = await renderCardAssets(
        card,
        interaction.guildId,
        interaction.guild.name,
      );

      const pngAttachment = new AttachmentBuilder(pngBuffer, {
        name: `${card.nomorIdentitas}.png`,
      });
      const pdfAttachment = new AttachmentBuilder(pdfBuffer, {
        name: `${card.nomorIdentitas}.pdf`,
      });

      const sentMessage = await interaction.editReply({
        embeds: [
          successEmbed(
            `KTP digital berhasil dibuat dengan nomor identitas \`${card.nomorIdentitas}\`. Status: **menunggu verifikasi admin**.`,
          ),
        ],
        files: [pngAttachment, pdfAttachment],
      });

      const pngUrl = sentMessage.attachments.find((attachment) =>
        attachment.name.endsWith(".png"),
      )?.url;
      const pdfUrl = sentMessage.attachments.find((attachment) =>
        attachment.name.endsWith(".pdf"),
      )?.url;
      if (pngUrl) card.cardImageUrl = pngUrl;
      if (pdfUrl) card.cardPdfUrl = pdfUrl;
      await card.save();

      await ActivityLog.create({
        guildId: interaction.guildId,
        type: "verification",
        actorId: interaction.user.id,
        targetId: interaction.user.id,
        description: `Membuat/memperbarui KTP digital (${card.nomorIdentitas})`,
        metadata: { nomorIdentitas: card.nomorIdentitas },
      });

      await clearDraft(interaction.guildId, interaction.user.id);
    } catch (error) {
      logger.error("Gagal membuat KTP digital", {
        error: error instanceof Error ? error.message : error,
      });
      await interaction.editReply({
        embeds: [errorEmbed("Gagal membuat kartu identitas. Coba lagi beberapa saat lagi.")],
      });
    }
  },
};

export default component;
