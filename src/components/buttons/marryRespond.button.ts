import type { ButtonComponent } from "../../types/component";
import { getOrCreateMember } from "../../services/profile/profileService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "marry:",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const [, action, proposerId] = interaction.customId.split(":");

    // Hanya orang yang dilamar (target) yang boleh menekan tombol.
    if (interaction.user.id === proposerId) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa menjawab lamaranmu sendiri.")],
        ephemeral: true,
      });
      return;
    }

    if (action === "decline") {
      await interaction.update({
        embeds: [
          buildEmbed("danger").setTitle("💔 Lamaran Ditolak").setDescription("Mungkin lain kali."),
        ],
        components: [],
      });
      return;
    }

    // accept
    const [me, proposer] = await Promise.all([
      getOrCreateMember(interaction.guildId, interaction.user.id),
      getOrCreateMember(interaction.guildId, proposerId!),
    ]);

    if (me.partnerId || proposer.partnerId) {
      await interaction.update({
        embeds: [errorEmbed("Salah satu dari kalian sudah menikah sekarang. Lamaran dibatalkan.")],
        components: [],
      });
      return;
    }

    const now = new Date();
    me.partnerId = proposerId;
    me.marriedAt = now;
    proposer.partnerId = interaction.user.id;
    proposer.marriedAt = now;
    await Promise.all([me.save(), proposer.save()]);

    await interaction.update({
      embeds: [
        buildEmbed("success")
          .setTitle("💒 Selamat Menempuh Hidup Baru!")
          .setDescription(`<@${proposerId}> dan ${interaction.user} kini resmi menikah! 🎉💕`),
      ],
      components: [],
    });
  },
};

export default component;
