import type { ButtonComponent } from "../../types/component";
import { GuildConfig } from "../../database/models/GuildConfig";
import { VerificationAttempt } from "../../database/models/VerificationAttempt";
import { errorEmbed, successEmbed } from "../../utils/embed";

const MAX_ATTEMPTS = 3;

const component: ButtonComponent = {
  customId: "security:captcha",
  execute: async (interaction) => {
    const [, , memberId, result] = interaction.customId.split(":");

    if (interaction.user.id !== memberId) {
      await interaction.reply({
        embeds: [errorEmbed("Captcha ini bukan untukmu.")],
        ephemeral: true,
      });
      return;
    }

    // Find the guild this verification belongs to by looking up the pending attempt for this user.
    const attempt = await VerificationAttempt.findOne({ userId: memberId, status: "pending" });
    if (!attempt) {
      await interaction.reply({
        embeds: [errorEmbed("Sesi verifikasi tidak ditemukan atau sudah kedaluwarsa.")],
        ephemeral: true,
      });
      return;
    }

    if (result === "correct") {
      const guildConfig = await GuildConfig.findOne({ guildId: attempt.guildId });
      const guild = await interaction.client.guilds.fetch(attempt.guildId).catch(() => null);
      const member = await guild?.members.fetch(memberId!).catch(() => null);

      if (member && guildConfig?.security) {
        if (guildConfig.security.unverifiedRoleId) {
          await member.roles
            .remove(guildConfig.security.unverifiedRoleId, "Verifikasi berhasil")
            .catch(() => undefined);
        }
        if (guildConfig.security.verifiedRoleId) {
          await member.roles
            .add(guildConfig.security.verifiedRoleId, "Verifikasi berhasil")
            .catch(() => undefined);
        }
      }

      attempt.status = "passed";
      await attempt.save();

      await interaction.update({
        embeds: [
          successEmbed(`Verifikasi berhasil! Selamat datang di **${guild?.name ?? "server"}**.`),
        ],
        components: [],
      });
      return;
    }

    attempt.attempts += 1;
    if (attempt.attempts >= MAX_ATTEMPTS) {
      attempt.status = "failed";
      await attempt.save();
      await interaction.update({
        embeds: [
          errorEmbed(
            "Jawaban salah terlalu banyak kali. Hubungi staff server untuk verifikasi manual.",
          ),
        ],
        components: [],
      });
      return;
    }

    await attempt.save();
    await interaction.reply({
      embeds: [
        errorEmbed(
          `Jawaban salah. Sisa percobaan: ${MAX_ATTEMPTS - attempt.attempts}. Coba tekan tombol yang lain.`,
        ),
      ],
      ephemeral: true,
    });
  },
};

export default component;
