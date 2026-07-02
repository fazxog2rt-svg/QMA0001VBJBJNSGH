import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed } from "../../utils/embed";
import { ensureVoiceContext, requireActiveQueue } from "../../services/music/guards";
import type { LoopMode } from "../../services/music/types";

const LABEL: Record<LoopMode, string> = {
  off: "🔁 Loop dinonaktifkan.",
  track: "🔂 Loop **satu lagu** diaktifkan.",
  queue: "🔁 Loop **antrean** diaktifkan.",
};

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Atur mode pengulangan lagu.")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Mode loop")
        .setRequired(true)
        .addChoices(
          { name: "Nonaktif", value: "off" },
          { name: "Satu lagu", value: "track" },
          { name: "Antrean", value: "queue" },
        ),
    ),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!(await ensureVoiceContext(interaction))) return;
    const queue = await requireActiveQueue(interaction);
    if (!queue) return;

    const mode = interaction.options.getString("mode", true) as LoopMode;
    queue.setLoop(mode);
    await interaction.reply({ embeds: [successEmbed(LABEL[mode])] });
  },
};

export default command;
