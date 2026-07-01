import { AttachmentBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { IdentityCard } from "../../database/models/IdentityCard";
import { ActivityLog } from "../../database/models";
import { saveDraft } from "../../services/ktp/ktpSession";
import { buildKtpStep1Modal } from "../../services/ktp/ktpModals";
import {
  renderCardAssets,
  rejectIdentityCard,
  verifyIdentityCard,
} from "../../services/ktp/ktpService";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { paginateEmbeds } from "../../utils/pagination";

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Menunggu Verifikasi",
  verified: "✅ Terverifikasi",
  rejected: "❌ Ditolak",
  expired: "⌛ Kedaluwarsa",
};

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ktp")
    .setDescription("Identitas digital (KTP) komunitas — bukan dokumen resmi negara.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buat")
        .setDescription("Buat atau perbarui KTP digitalmu.")
        .addAttachmentOption((option) =>
          option
            .setName("foto")
            .setDescription("Foto untuk kartu (opsional, default: avatar Discord).")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lihat")
        .setDescription("Lihat KTP digital.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Lihat KTP milik user lain (admin saja)."),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("riwayat").setDescription("Lihat riwayat perubahan data KTP-mu."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("verifikasi")
        .setDescription("[Admin] Verifikasi KTP digital milik member.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Member yang KTP-nya diverifikasi.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tolak")
        .setDescription("[Admin] Tolak KTP digital milik member.")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member yang KTP-nya ditolak.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("alasan").setDescription("Alasan penolakan.").setRequired(true),
        ),
    ),
  category: "ktp",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "buat") {
      const attachment = interaction.options.getAttachment("foto");
      const photoUrl =
        attachment?.url ?? interaction.user.displayAvatarURL({ size: 512, extension: "png" });

      await saveDraft(interaction.guildId, interaction.user.id, { photoUrl });
      await interaction.showModal(buildKtpStep1Modal());
      return;
    }

    if (subcommand === "lihat") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const isSelf = target.id === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

      if (!isSelf && !isAdmin) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu hanya bisa melihat KTP milikmu sendiri.")],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const card = await IdentityCard.findOne({ guildId: interaction.guildId, userId: target.id });
      if (!card) {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              isSelf
                ? "Kamu belum punya KTP digital. Gunakan `/ktp buat`."
                : "Member ini belum punya KTP digital.",
            ),
          ],
        });
        return;
      }

      const { pngBuffer, pdfBuffer } = await renderCardAssets(
        card,
        interaction.guildId,
        interaction.guild.name,
      );

      await interaction.editReply({
        embeds: [
          buildEmbed("primary")
            .setTitle(`🪪 KTP Digital — ${card.nama}`)
            .setDescription(`Status: **${STATUS_LABELS[card.status] ?? card.status}**`)
            .addFields({ name: "Nomor Identitas", value: card.nomorIdentitas }),
        ],
        files: [
          new AttachmentBuilder(pngBuffer, { name: `${card.nomorIdentitas}.png` }),
          new AttachmentBuilder(pdfBuffer, { name: `${card.nomorIdentitas}.pdf` }),
        ],
      });
      return;
    }

    if (subcommand === "riwayat") {
      await interaction.deferReply({ ephemeral: true });

      const card = await IdentityCard.findOne({
        guildId: interaction.guildId,
        userId: interaction.user.id,
      });
      if (!card || card.history.length === 0) {
        await interaction.editReply({
          embeds: [errorEmbed("Belum ada riwayat perubahan data KTP.")],
        });
        return;
      }

      const entriesPerPage = 5;
      const pages: string[][] = [];
      for (let i = 0; i < card.history.length; i += entriesPerPage) {
        pages.push(
          card.history
            .slice(i, i + entriesPerPage)
            .reverse()
            .map(
              (entry) =>
                `**${entry.field}**: \`${entry.oldValue ?? "-"}\` → \`${entry.newValue ?? "-"}\` (${entry.changedAt.toLocaleDateString("id-ID")})`,
            ),
        );
      }

      const embeds = pages.map((lines) =>
        buildEmbed("primary").setTitle("📜 Riwayat Perubahan KTP").setDescription(lines.join("\n")),
      );

      await paginateEmbeds(interaction, embeds);
      return;
    }

    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
    if (!hasManageGuild) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu butuh izin **Manage Server** untuk melakukan ini.")],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "verifikasi") {
      const target = interaction.options.getUser("user", true);
      const card = await verifyIdentityCard(interaction.guildId, target.id, interaction.user.id);

      if (!card) {
        await interaction.reply({
          embeds: [errorEmbed("Member ini belum punya KTP digital.")],
          ephemeral: true,
        });
        return;
      }

      await ActivityLog.create({
        guildId: interaction.guildId,
        type: "verification",
        actorId: interaction.user.id,
        targetId: target.id,
        description: `KTP digital (${card.nomorIdentitas}) diverifikasi.`,
      });

      await interaction.reply({
        embeds: [
          successEmbed(
            `KTP digital milik <@${target.id}> (\`${card.nomorIdentitas}\`) telah diverifikasi.`,
          ),
        ],
      });

      await target
        .send({
          embeds: [
            successEmbed(`KTP digitalmu di **${interaction.guild.name}** telah diverifikasi.`),
          ],
        })
        .catch(() => undefined);
      return;
    }

    if (subcommand === "tolak") {
      const target = interaction.options.getUser("user", true);
      const alasan = interaction.options.getString("alasan", true);
      const card = await rejectIdentityCard(
        interaction.guildId,
        target.id,
        interaction.user.id,
        alasan,
      );

      if (!card) {
        await interaction.reply({
          embeds: [errorEmbed("Member ini belum punya KTP digital.")],
          ephemeral: true,
        });
        return;
      }

      await ActivityLog.create({
        guildId: interaction.guildId,
        type: "verification",
        actorId: interaction.user.id,
        targetId: target.id,
        description: `KTP digital (${card.nomorIdentitas}) ditolak: ${alasan}`,
      });

      await interaction.reply({
        embeds: [
          successEmbed(`KTP digital milik <@${target.id}> (\`${card.nomorIdentitas}\`) ditolak.`),
        ],
      });

      await target
        .send({
          embeds: [
            errorEmbed(
              `KTP digitalmu di **${interaction.guild.name}** ditolak.\nAlasan: ${alasan}\nGunakan \`/ktp buat\` untuk mengajukan ulang.`,
            ),
          ],
        })
        .catch(() => undefined);
    }
  },
};

export default command;
