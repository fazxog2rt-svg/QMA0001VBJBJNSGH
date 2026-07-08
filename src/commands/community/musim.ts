import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import {
  buyPremium,
  buildInfoEmbed,
  buildMissionEmbed,
  buildPassEmbed,
  claimRewards,
  getOrCreateProgress,
  startSeason,
} from "../../services/community/seasonService";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("musim")
    .setDescription("Battle Pass musiman — naik tier, selesaikan misi, klaim hadiah.")
    .addSubcommand((s) => s.setName("info").setDescription("Lihat progres Battle Pass-mu."))
    .addSubcommand((s) => s.setName("pass").setDescription("Lihat reward track tiap tier."))
    .addSubcommand((s) =>
      s.setName("klaim").setDescription("Klaim semua hadiah tier yang tersedia."),
    )
    .addSubcommand((s) => s.setName("misi").setDescription("Lihat misi harian & mingguan."))
    .addSubcommand((s) =>
      s.setName("beli-premium").setDescription("Buka jalur premium (hadiah lebih besar)."),
    )
    .addSubcommand((s) =>
      s
        .setName("mulai")
        .setDescription("[Admin] Mulai musim baru.")
        .addStringOption((o) =>
          o.setName("nama").setDescription("Nama musim (mis. 'Musim Kemarau')."),
        )
        .addIntegerOption((o) =>
          o
            .setName("durasi-hari")
            .setDescription("Lama musim dalam hari (1-120, default 30).")
            .setMinValue(1)
            .setMaxValue(120),
        ),
    ),
  category: "community",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Perintah ini hanya untuk di dalam server.")],
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === "mulai") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          embeds: [errorEmbed("Butuh izin **Manage Server** untuk memulai musim.")],
          ephemeral: true,
        });
        return;
      }
      const nama = interaction.options.getString("nama") ?? "";
      const durasi = interaction.options.getInteger("durasi-hari") ?? 30;
      const result = await startSeason(guildId, nama, durasi);
      if (!result.ok || !result.data) {
        await interaction.reply({
          embeds: [errorEmbed(result.error ?? "Gagal.")],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Musim **${result.data.name}** dimulai! Berakhir <t:${Math.floor(result.data.endsAt.getTime() / 1000)}:R>. Member bisa cek \`/musim info\`.`,
          ),
        ],
      });
      return;
    }

    if (sub === "klaim") {
      const result = await claimRewards(guildId, userId);
      if (!result.ok || !result.data) {
        await interaction.reply({
          embeds: [errorEmbed(result.error ?? "Gagal.")],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Kamu mengklaim hadiah tier ${result.data.claimedTiers.join(", ")} — total **${result.data.coins}** coins! 🎉`,
          ),
        ],
      });
      return;
    }

    if (sub === "beli-premium") {
      const result = await buyPremium(guildId, userId);
      await interaction.reply({
        embeds: [
          result.ok
            ? successEmbed(
                "Jalur **Premium** 💎 terbuka! Klaim hadiah tambahan dengan `/musim klaim`.",
              )
            : errorEmbed(result.error ?? "Gagal."),
        ],
        ephemeral: !result.ok,
      });
      return;
    }

    // info / pass / misi butuh progres
    const ctx = await getOrCreateProgress(guildId, userId);
    if (!ctx) {
      await interaction.reply({
        embeds: [
          buildEmbed("info")
            .setTitle("🎟️ Battle Pass")
            .setDescription(
              "Belum ada musim yang berjalan. Admin bisa mulai dengan `/musim mulai`.",
            ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === "pass") {
      await interaction.reply({ embeds: [buildPassEmbed(ctx.progress)] });
      return;
    }
    if (sub === "misi") {
      await interaction.reply({ embeds: [buildMissionEmbed(ctx.progress)] });
      return;
    }
    await interaction.reply({ embeds: [buildInfoEmbed(ctx.season, ctx.progress)] });
  },
};

export default command;
