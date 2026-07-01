import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { isAiConfigured } from "../../services/ai/openRouterClient";
import { errorEmbed, successEmbed, warningEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-toggle")
    .setDescription("[Admin] Aktif/nonaktifkan fitur AI assistant untuk server ini.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption((option) =>
      option.setName("aktif").setDescription("Aktifkan fitur AI?").setRequired(true),
    ),
  category: "ai",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const aktif = interaction.options.getBoolean("aktif", true);

    if (aktif && !isAiConfigured()) {
      await interaction.reply({
        embeds: [
          warningEmbed(
            "Bot belum dikonfigurasi dengan `OPENROUTER_API_KEY`. Hubungi pemilik bot untuk mengatur ini terlebih dahulu.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $set: { aiAssistantEnabled: aktif } },
      { upsert: true },
    );

    await interaction.reply({
      embeds: [
        successEmbed(`Fitur AI ${aktif ? "diaktifkan" : "dinonaktifkan"} untuk server ini.`),
      ],
    });
  },
};

export default command;
