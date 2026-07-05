import { GuildMember } from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { GuildConfig } from "../../database/models/GuildConfig";
import { errorEmbed, successEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "verify:panel",
  execute: async (interaction) => {
    if (!interaction.inGuild() || !(interaction.member instanceof GuildMember)) return;

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const verifiedRoleId = config?.security?.verifiedRoleId;
    if (!verifiedRoleId) {
      await interaction.reply({
        embeds: [errorEmbed("Verifikasi belum dikonfigurasi. Hubungi admin.")],
        ephemeral: true,
      });
      return;
    }

    if (interaction.member.roles.cache.has(verifiedRoleId)) {
      await interaction.reply({
        embeds: [successEmbed("Kamu sudah terverifikasi. 🎉")],
        ephemeral: true,
      });
      return;
    }

    const unverifiedRoleId = config.security?.unverifiedRoleId;
    try {
      await interaction.member.roles.add(verifiedRoleId, "Verifikasi via panel");
      if (unverifiedRoleId && interaction.member.roles.cache.has(unverifiedRoleId)) {
        await interaction.member.roles
          .remove(unverifiedRoleId, "Verifikasi via panel")
          .catch(() => undefined);
      }
    } catch {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Gagal memberi role. Pastikan role bot berada **di atas** role verified dan bot punya izin Manage Roles.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [successEmbed("Verifikasi berhasil! Selamat menikmati server. 🎉")],
      ephemeral: true,
    });
  },
};

export default component;
