import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { AutoResponder } from "../../database/models/AutoResponder";
import { invalidateAutoResponderCache } from "../../services/community/autoResponderService";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("autoresponder")
    .setDescription("[Admin] Balasan otomatis untuk kata/kalimat tertentu.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName("tambah")
        .setDescription("Tambah auto-responder baru.")
        .addStringOption((o) =>
          o
            .setName("trigger")
            .setDescription("Kata/kalimat pemicu.")
            .setRequired(true)
            .setMaxLength(100),
        )
        .addStringOption((o) =>
          o.setName("balasan").setDescription("Balasan bot.").setRequired(true).setMaxLength(1500),
        )
        .addStringOption((o) =>
          o
            .setName("cocok")
            .setDescription("Cara mencocokkan (default: mengandung).")
            .addChoices(
              { name: "Mengandung kata", value: "contains" },
              { name: "Persis sama", value: "exact" },
              { name: "Diawali dengan", value: "startsWith" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("hapus")
        .setDescription("Hapus auto-responder.")
        .addStringOption((o) =>
          o.setName("trigger").setDescription("Trigger yang mau dihapus.").setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("Lihat semua auto-responder.")),
  category: "community",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "tambah") {
      const trigger = interaction.options.getString("trigger", true).toLowerCase();
      const response = interaction.options.getString("balasan", true);
      const matchType = interaction.options.getString("cocok") ?? "contains";

      const existing = await AutoResponder.findOne({ guildId: interaction.guildId, trigger });
      if (existing) {
        await interaction.reply({
          embeds: [errorEmbed(`Trigger \`${trigger}\` sudah ada. Hapus dulu untuk mengubahnya.`)],
          ephemeral: true,
        });
        return;
      }

      await AutoResponder.create({
        guildId: interaction.guildId,
        trigger,
        response,
        matchType,
        createdBy: interaction.user.id,
      });
      invalidateAutoResponderCache(interaction.guildId);
      await interaction.reply({
        embeds: [successEmbed(`Auto-responder ditambahkan untuk \`${trigger}\`.`)],
      });
      return;
    }

    if (sub === "hapus") {
      const trigger = interaction.options.getString("trigger", true).toLowerCase();
      const deleted = await AutoResponder.findOneAndDelete({
        guildId: interaction.guildId,
        trigger,
      });
      invalidateAutoResponderCache(interaction.guildId);
      await interaction.reply({
        embeds: [
          deleted
            ? successEmbed(`Auto-responder \`${trigger}\` dihapus.`)
            : errorEmbed(`Trigger \`${trigger}\` tidak ditemukan.`),
        ],
        ephemeral: !deleted,
      });
      return;
    }

    // list
    const items = await AutoResponder.find({ guildId: interaction.guildId }).lean();
    if (items.length === 0) {
      await interaction.reply({
        embeds: [buildEmbed("primary").setDescription("Belum ada auto-responder.")],
        ephemeral: true,
      });
      return;
    }
    const lines = items.map(
      (i) => `• \`${i.trigger}\` (${i.matchType}) → ${i.response.slice(0, 60)}`,
    );
    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle("💬 Auto-Responder")
          .setDescription(lines.join("\n").slice(0, 4000)),
      ],
      ephemeral: true,
    });
  },
};

export default command;
