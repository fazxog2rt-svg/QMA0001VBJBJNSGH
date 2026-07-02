import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed } from "../../utils/embed";
import { ensureVoiceContext, requireActiveQueue } from "../../services/music/guards";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Atur volume musik (0-200%).")
    .addIntegerOption((option) =>
      option
        .setName("persen")
        .setDescription("Level volume 0-200")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200),
    ),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!(await ensureVoiceContext(interaction))) return;
    const queue = await requireActiveQueue(interaction);
    if (!queue) return;

    const percent = interaction.options.getInteger("persen", true);
    queue.setVolume(percent);
    await interaction.reply({ embeds: [successEmbed(`🔊 Volume diatur ke **${percent}%**.`)] });
  },
};

export default command;
