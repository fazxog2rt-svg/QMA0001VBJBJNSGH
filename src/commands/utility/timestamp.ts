import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { parseDurationMs } from "../../services/community/timeParser";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("timestamp")
    .setDescription("Buat Discord timestamp dinamis.")
    .addStringOption((option) =>
      option
        .setName("dari-sekarang")
        .setDescription("Offset dari sekarang, mis. 2h, 3d, 30m. Kosongkan untuk sekarang."),
    ),
  category: "utility",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const offsetInput = interaction.options.getString("dari-sekarang");
    let targetMs = Date.now();

    if (offsetInput) {
      const offsetMs = parseDurationMs(offsetInput);
      if (offsetMs === null) {
        await interaction.reply({
          embeds: [errorEmbed("Format offset tidak valid. Contoh: `2h`, `3d`, `30m`.")],
          ephemeral: true,
        });
        return;
      }
      targetMs += offsetMs;
    }

    const unix = Math.floor(targetMs / 1000);
    const formats = ["t", "T", "d", "D", "f", "F", "R"];
    const lines = formats.map((format) => `\`<t:${unix}:${format}>\` → <t:${unix}:${format}>`);

    await interaction.reply({
      embeds: [
        buildEmbed("primary").setTitle("🕒 Discord Timestamp").setDescription(lines.join("\n")),
      ],
      ephemeral: true,
    });
  },
};

export default command;
