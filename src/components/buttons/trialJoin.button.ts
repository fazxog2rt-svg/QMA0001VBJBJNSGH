import { GuildMember } from "discord.js";
import type { ButtonComponent } from "../../types/component";
import { Member } from "../../database/models/Member";
import { joinTrial } from "../../services/moderation/trialService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const component: ButtonComponent = {
  customId: "trial:join",
  execute: async (interaction) => {
    if (!interaction.inGuild() || !(interaction.member instanceof GuildMember)) return;
    const caseNumber = Number(interaction.customId.split(":")[2]);

    const memberDoc = await Member.findOne({
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });
    const level = memberDoc?.level ?? 0;
    const roleIds = [...interaction.member.roles.cache.keys()];

    const result = await joinTrial(interaction.guildId, caseNumber, interaction.user.id, {
      level,
      roleIds,
    });
    await interaction.reply({
      embeds: [
        result.ok
          ? successEmbed(`Kamu terdaftar sebagai peserta sidang **#${caseNumber}**. 🙋`)
          : errorEmbed(result.error ?? "Gagal ikut sidang."),
      ],
      ephemeral: true,
    });
  },
};

export default component;
