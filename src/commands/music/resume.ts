import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed, warningEmbed } from "../../utils/embed";
import { ensureVoiceContext, requireActiveQueue } from "../../services/music/guards";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("resume").setDescription("Lanjutkan lagu yang dijeda."),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!(await ensureVoiceContext(interaction))) return;
    const queue = await requireActiveQueue(interaction);
    if (!queue) return;

    const resumed = queue.resume();
    await interaction.reply({
      embeds: [
        resumed ? successEmbed("▶️ Lagu dilanjutkan.") : warningEmbed("Lagu sedang diputar."),
      ],
    });
  },
};

export default command;
