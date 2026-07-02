import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed, warningEmbed } from "../../utils/embed";
import { ensureVoiceContext, requireActiveQueue } from "../../services/music/guards";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Jeda lagu yang sedang diputar."),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!(await ensureVoiceContext(interaction))) return;
    const queue = await requireActiveQueue(interaction);
    if (!queue) return;

    const paused = queue.pause();
    await interaction.reply({
      embeds: [
        paused ? successEmbed("⏸️ Lagu dijeda.") : warningEmbed("Lagu sudah dalam keadaan jeda."),
      ],
    });
  },
};

export default command;
