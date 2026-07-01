import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import type { Command } from "../../types/command";

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a quick reaction poll")
    .addStringOption((opt) => opt.setName("question").setDescription("The poll question").setRequired(true))
    .addStringOption((opt) => opt.setName("options").setDescription("Comma-separated options (2-10), omit for a yes/no poll").setRequired(false)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const question = interaction.options.getString("question", true);
    const optionsInput = interaction.options.getString("options");

    const options = optionsInput
      ? optionsInput.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10)
      : ["Yes", "No"];

    if (options.length < 2) {
      await interaction.reply({ content: "Provide at least 2 options.", flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join("\n"))
      .setColor(0x5865f2)
      .setFooter({ text: `Poll started by ${interaction.user.username}` });

    const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < options.length; i++) {
      await reply.react(NUMBER_EMOJIS[i]).catch(() => undefined);
    }
  },
};

export default command;
