import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed, warningEmbed } from "../../utils/embed";
import { ensureVoiceContext, requireActiveQueue } from "../../services/music/guards";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("shuffle").setDescription("Acak urutan antrean lagu."),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!(await ensureVoiceContext(interaction))) return;
    const queue = await requireActiveQueue(interaction);
    if (!queue) return;

    if (queue.tracks.length < 2) {
      await interaction.reply({
        embeds: [warningEmbed("Antrean terlalu sedikit untuk diacak.")],
        ephemeral: true,
      });
      return;
    }

    queue.shuffle();
    await interaction.reply({
      embeds: [successEmbed(`🔀 Antrean **${queue.tracks.length} lagu** diacak.`)],
    });
  },
};

export default command;
