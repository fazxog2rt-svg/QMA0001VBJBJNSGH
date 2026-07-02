import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed } from "../../utils/embed";
import { ensureVoiceContext, requireActiveQueue } from "../../services/music/guards";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Lewati lagu yang sedang diputar."),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!(await ensureVoiceContext(interaction))) return;
    const queue = await requireActiveQueue(interaction);
    if (!queue) return;

    const title = queue.current?.title ?? "Lagu";
    queue.skip();
    await interaction.reply({ embeds: [successEmbed(`⏭️ Melewati **${title}**.`)] });
  },
};

export default command;
