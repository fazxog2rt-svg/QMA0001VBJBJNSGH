import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";

interface GuessGame {
  secret: number;
  attempts: number;
  max: number;
}

// Sesi disimpan di memori per guild:user. Cukup untuk permainan singkat.
const games = new Map<string, GuessGame>();

const MAX_NUMBER = 100;
const MAX_ATTEMPTS = 7;

function key(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("tebak-angka")
    .setDescription(`Tebak angka 1–${MAX_NUMBER}. Mulai tanpa tebakan, lalu tebak!`)
    .addIntegerOption((opt) =>
      opt
        .setName("tebakan")
        .setDescription("Angka tebakanmu (kosongkan untuk memulai game baru).")
        .setMinValue(1)
        .setMaxValue(MAX_NUMBER),
    ),
  category: "fun",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const gameKey = key(interaction.guildId, interaction.user.id);
    const guess = interaction.options.getInteger("tebakan");

    let game = games.get(gameKey);

    // Mulai game baru bila belum ada, atau user tidak memberi tebakan.
    if (!game || guess === null) {
      game = { secret: Math.floor(Math.random() * MAX_NUMBER) + 1, attempts: 0, max: MAX_ATTEMPTS };
      games.set(gameKey, game);
      await interaction.reply({
        embeds: [
          buildEmbed("primary")
            .setTitle("🔢 Tebak Angka")
            .setDescription(
              `Aku sudah memikirkan angka **1–${MAX_NUMBER}**.\n` +
                `Kamu punya **${MAX_ATTEMPTS}** kesempatan. Tebak dengan \`/tebak-angka tebakan:<angka>\`!`,
            ),
        ],
      });
      return;
    }

    game.attempts += 1;

    if (guess === game.secret) {
      games.delete(gameKey);
      await interaction.reply({
        embeds: [
          buildEmbed("success").setDescription(
            `🎉 **BENAR!** Angkanya **${game.secret}**. Kamu menebak dalam **${game.attempts}** percobaan!`,
          ),
        ],
      });
      return;
    }

    if (game.attempts >= game.max) {
      const secret = game.secret;
      games.delete(gameKey);
      await interaction.reply({
        embeds: [
          buildEmbed("danger").setDescription(
            `💥 Kesempatanmu habis! Angkanya adalah **${secret}**. Coba lagi dengan \`/tebak-angka\`.`,
          ),
        ],
      });
      return;
    }

    const hint = guess < game.secret ? "lebih **BESAR** ⬆️" : "lebih **KECIL** ⬇️";
    await interaction.reply({
      embeds: [
        buildEmbed("warning").setDescription(
          `Angkanya ${hint} dari **${guess}**.\nSisa kesempatan: **${game.max - game.attempts}**.`,
        ),
      ],
    });
  },
};

export default command;
