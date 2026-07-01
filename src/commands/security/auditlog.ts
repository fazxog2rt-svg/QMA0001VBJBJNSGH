import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { ACTIVITY_LOG_TYPES, ActivityLog } from "../../database/models/ActivityLog";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { paginateEmbeds } from "../../utils/pagination";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("auditlog")
    .setDescription("[Admin] Lihat log aktivitas server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("tipe")
        .setDescription("Filter berdasarkan tipe aktivitas.")
        .addChoices(...ACTIVITY_LOG_TYPES.map((type) => ({ name: type, value: type }))),
    ),
  category: "security",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const tipe = interaction.options.getString("tipe");
    const query = tipe
      ? { guildId: interaction.guildId, type: tipe }
      : { guildId: interaction.guildId };

    const entries = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(100);
    if (entries.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed("Belum ada log aktivitas.")] });
      return;
    }

    const perPage = 10;
    const embeds = [];
    for (let i = 0; i < entries.length; i += perPage) {
      const lines = entries
        .slice(i, i + perPage)
        .map(
          (entry) =>
            `**[${entry.type}]** ${entry.description} — <t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`,
        );
      embeds.push(
        buildEmbed("primary")
          .setTitle(`📜 Audit Log${tipe ? ` — ${tipe}` : ""}`)
          .setDescription(lines.join("\n")),
      );
    }

    await paginateEmbeds(interaction, embeds);
  },
};

export default command;
