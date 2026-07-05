import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { isAiConfigured } from "../../services/ai/openRouterClient";
import {
  AI_MODELS,
  AI_PERSONAS,
  isAiPersonaKey,
  isValidAiModel,
} from "../../services/ai/aiPersonas";
import {
  listAiChannels,
  removeAiChannel,
  upsertAiChannel,
} from "../../services/ai/aiChannelService";

const personaChoices = Object.entries(AI_PERSONAS).map(([key, value]) => ({
  name: `${value.emoji} ${value.label}`,
  value: key,
}));

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ai-channel")
    .setDescription("[Admin] Atur channel yang otomatis dibalas AI.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Jadikan sebuah channel sebagai channel auto-reply AI.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel teks yang akan dibalas AI otomatis.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("gaya")
            .setDescription("Gaya bahasa / persona AI.")
            .setRequired(true)
            .addChoices(...personaChoices),
        )
        .addStringOption((opt) =>
          opt
            .setName("model")
            .setDescription("Model AI (OpenRouter).")
            .setRequired(true)
            .addChoices(...AI_MODELS.map((m) => ({ name: m.name, value: m.value }))),
        )
        .addStringOption((opt) =>
          opt
            .setName("instruksi")
            .setDescription("Instruksi tambahan opsional (mis. topik/aturan khusus).")
            .setMaxLength(500),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("nonaktif")
        .setDescription("Matikan auto-reply AI di sebuah channel.")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel yang ingin dinonaktifkan.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Lihat daftar channel auto-reply AI."),
    ),
  category: "ai",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    if (!isAiConfigured()) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Fitur AI belum dikonfigurasi. Admin bot perlu mengatur `OPENROUTER_API_KEY` di `.env`.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const channel = interaction.options.getChannel("channel", true);
      const persona = interaction.options.getString("gaya", true);
      const model = interaction.options.getString("model", true);
      const instruksi = interaction.options.getString("instruksi") ?? "";

      if (!isAiPersonaKey(persona) || !isValidAiModel(model)) {
        await interaction.reply({
          embeds: [errorEmbed("Gaya atau model tidak valid.")],
          ephemeral: true,
        });
        return;
      }

      await upsertAiChannel(interaction.guildId, channel.id, persona, model, instruksi);

      const personaInfo = AI_PERSONAS[persona];
      const modelInfo = AI_MODELS.find((m) => m.value === model);
      await interaction.reply({
        embeds: [
          successEmbed(
            `Channel <#${channel.id}> sekarang **auto-reply AI**.\n` +
              `${personaInfo.emoji} Gaya: **${personaInfo.label}**\n` +
              `🧠 Model: **${modelInfo?.name ?? model}**` +
              (instruksi ? `\n📝 Instruksi: ${instruksi}` : ""),
          ),
        ],
      });
      return;
    }

    if (sub === "nonaktif") {
      const channel = interaction.options.getChannel("channel", true);
      const removed = await removeAiChannel(interaction.guildId, channel.id);
      await interaction.reply({
        embeds: [
          removed
            ? successEmbed(`Auto-reply AI di <#${channel.id}> dinonaktifkan.`)
            : errorEmbed(`<#${channel.id}> bukan channel auto-reply AI.`),
        ],
      });
      return;
    }

    // list
    const channels = await listAiChannels(interaction.guildId);
    if (channels.length === 0) {
      await interaction.reply({
        embeds: [buildEmbed("primary").setDescription("Belum ada channel auto-reply AI.")],
        ephemeral: true,
      });
      return;
    }

    const lines = channels.map((c) => {
      const personaInfo = isAiPersonaKey(c.persona) ? AI_PERSONAS[c.persona] : null;
      const modelInfo = AI_MODELS.find((m) => m.value === c.model);
      return (
        `• <#${c.channelId}> — ${personaInfo?.emoji ?? "🤖"} ${personaInfo?.label ?? c.persona} · ` +
        `${modelInfo?.name ?? c.model}`
      );
    });

    await interaction.reply({
      embeds: [
        buildEmbed("primary").setTitle("🤖 Channel Auto-Reply AI").setDescription(lines.join("\n")),
      ],
      ephemeral: true,
    });
  },
};

export default command;
