import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const MAX_OPTIONS = 10;

const command: SlashCommand = {
  data: (() => {
    const builder = new SlashCommandBuilder()
      .setName("poll")
      .setDescription("Buat polling dengan reaksi.")
      .addStringOption((option) =>
        option.setName("pertanyaan").setDescription("Pertanyaan polling.").setRequired(true),
      )
      .addStringOption((option) =>
        option.setName("opsi1").setDescription("Opsi 1.").setRequired(true),
      )
      .addStringOption((option) =>
        option.setName("opsi2").setDescription("Opsi 2.").setRequired(true),
      );

    for (let i = 3; i <= MAX_OPTIONS; i += 1) {
      builder.addStringOption((option) =>
        option.setName(`opsi${i}`).setDescription(`Opsi ${i}.`).setRequired(false),
      );
    }

    return builder;
  })(),
  category: "community",
  cooldownSeconds: 10,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const pertanyaan = interaction.options.getString("pertanyaan", true);
    const options: string[] = [];
    for (let i = 1; i <= MAX_OPTIONS; i += 1) {
      const value = interaction.options.getString(`opsi${i}`);
      if (value) options.push(value);
    }

    const description = options
      .map((option, index) => `${NUMBER_EMOJIS[index]} ${option}`)
      .join("\n");

    const embed = buildEmbed("primary")
      .setTitle(`📊 ${pertanyaan}`)
      .setDescription(description)
      .setFooter({ text: `Poll dibuat oleh ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();

    for (let i = 0; i < options.length; i += 1) {
      await message.react(NUMBER_EMOJIS[i]!).catch(() => undefined);
    }
  },
};

export default command;
