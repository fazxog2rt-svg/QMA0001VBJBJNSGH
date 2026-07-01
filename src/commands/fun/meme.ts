import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";

interface MemeApiResponse {
  title?: string;
  url?: string;
  postLink?: string;
  nsfw?: boolean;
  subreddit?: string;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("meme").setDescription("Ambil meme acak dari Reddit."),
  category: "fun",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const response = await fetch("https://meme-api.com/gimme");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as MemeApiResponse;
      if (!data.url || data.nsfw) {
        await interaction.editReply({
          embeds: [errorEmbed("Gagal mengambil meme yang aman. Coba lagi.")],
        });
        return;
      }

      await interaction.editReply({
        embeds: [
          buildEmbed("primary")
            .setTitle(data.title?.slice(0, 256) ?? "Meme")
            .setImage(data.url)
            .setFooter({ text: `r/${data.subreddit ?? "memes"}` })
            .setURL(data.postLink ?? null),
        ],
      });
    } catch (error) {
      logger.warn("Gagal mengambil meme", {
        error: error instanceof Error ? error.message : error,
      });
      await interaction.editReply({
        embeds: [errorEmbed("Gagal mengambil meme saat ini. Coba lagi nanti.")],
      });
    }
  },
};

export default command;
