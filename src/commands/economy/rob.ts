import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getOrCreateMember } from "../../services/profile/profileService";
import { adjustWallet, getCurrencySymbol } from "../../services/economy/economyService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const ROB_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 jam
const SUCCESS_CHANCE = 0.45;
const MIN_TARGET_WALLET = 100; // target harus punya minimal ini
const FINE_RATE = 0.3; // denda jika gagal (dari wallet perampok)

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Rampok koin member lain — berisiko kena denda kalau gagal!")
    .addUserOption((opt) =>
      opt.setName("target").setDescription("Member yang mau dirampok.").setRequired(true),
    ),
  category: "economy",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const target = interaction.options.getUser("target", true);
    if (target.bot || target.id === interaction.user.id) {
      await interaction.reply({
        embeds: [errorEmbed("Target tidak valid.")],
        ephemeral: true,
      });
      return;
    }

    const robber = await getOrCreateMember(interaction.guildId, interaction.user.id);
    const now = Date.now();
    if (robber.lastRobAt && now - robber.lastRobAt.getTime() < ROB_COOLDOWN_MS) {
      const mins = Math.ceil((ROB_COOLDOWN_MS - (now - robber.lastRobAt.getTime())) / 60_000);
      await interaction.reply({
        embeds: [errorEmbed(`Kamu masih diincar polisi. Coba lagi dalam **${mins} menit**.`)],
        ephemeral: true,
      });
      return;
    }

    const victim = await getOrCreateMember(interaction.guildId, target.id);
    if (victim.walletBalance < MIN_TARGET_WALLET) {
      await interaction.reply({
        embeds: [errorEmbed(`${target} tidak punya cukup koin di wallet untuk dirampok.`)],
        ephemeral: true,
      });
      return;
    }

    robber.lastRobAt = new Date();
    await robber.save();

    const symbol = await getCurrencySymbol(interaction.guildId);

    if (Math.random() < SUCCESS_CHANCE) {
      // Berhasil: ambil 10–40% wallet korban secara atomik.
      const percent = 0.1 + Math.random() * 0.3;
      const stolen = Math.floor(victim.walletBalance * percent);
      const taken = await adjustWallet(interaction.guildId, target.id, -stolen);
      if (taken.success) {
        await adjustWallet(interaction.guildId, interaction.user.id, stolen);
      }
      await interaction.reply({
        embeds: [
          buildEmbed("success").setDescription(
            `🦹 Kamu berhasil merampok **${symbol} ${stolen.toLocaleString("id-ID")}** dari ${target}!`,
          ),
        ],
      });
      return;
    }

    // Gagal: kena denda dari wallet perampok.
    const fine = Math.floor(robber.walletBalance * FINE_RATE);
    if (fine > 0) await adjustWallet(interaction.guildId, interaction.user.id, -fine);
    await interaction.reply({
      embeds: [
        buildEmbed("danger").setDescription(
          `🚨 Kamu ketahuan mencoba merampok ${target} dan kena denda **${symbol} ${fine.toLocaleString("id-ID")}**!`,
        ),
      ],
    });
  },
};

export default command;
