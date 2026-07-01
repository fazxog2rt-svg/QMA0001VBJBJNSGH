import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";
import { t } from "../../utils/locale";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Cek latensi bot."),
  category: "utility",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const sentAt = Date.now();
    await interaction.deferReply();
    const roundtripMs = Date.now() - sentAt;

    const embed = buildEmbed("info")
      .setTitle(t("ping.title"))
      .setDescription(
        t("ping.description", { ws: interaction.client.ws.ping, roundtrip: roundtripMs }),
      );

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
