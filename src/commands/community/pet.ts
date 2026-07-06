import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import {
  PET_SPECIES,
  adoptPet,
  feedPet,
  getPet,
  playWithPet,
  renamePet,
  xpForNextLevel,
} from "../../services/community/petService";

function bar(value: number): string {
  const filled = Math.round(value / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${value}%`;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Sistem pet — adopsi & rawat peliharaanmu!")
    .addSubcommand((s) =>
      s
        .setName("adopsi")
        .setDescription("Adopsi pet baru.")
        .addStringOption((o) =>
          o.setName("nama").setDescription("Nama pet.").setRequired(true).setMaxLength(30),
        )
        .addStringOption((o) =>
          o
            .setName("spesies")
            .setDescription("Jenis pet.")
            .setRequired(true)
            .addChoices(...PET_SPECIES),
        ),
    )
    .addSubcommand((s) => s.setName("status").setDescription("Lihat kondisi pet-mu."))
    .addSubcommand((s) => s.setName("kasih-makan").setDescription("Kasih makan pet (🪙 50)."))
    .addSubcommand((s) => s.setName("main").setDescription("Ajak pet main (+happiness & XP)."))
    .addSubcommand((s) =>
      s
        .setName("rename")
        .setDescription("Ganti nama pet.")
        .addStringOption((o) =>
          o.setName("nama").setDescription("Nama baru.").setRequired(true).setMaxLength(30),
        ),
    ),
  category: "community",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();
    const { guildId } = interaction;
    const userId = interaction.user.id;

    if (sub === "adopsi") {
      const nama = interaction.options.getString("nama", true);
      const spesies = interaction.options.getString("spesies", true);
      const result = await adoptPet(guildId, userId, nama, spesies);
      if (!result.ok || !result.pet) {
        await interaction.reply({
          embeds: [errorEmbed(result.error ?? "Gagal adopsi.")],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Selamat! Kamu mengadopsi ${spesies} bernama **${nama}**. Rawat baik-baik ya! 🥰`,
          ),
        ],
      });
      return;
    }

    if (sub === "kasih-makan") {
      const result = await feedPet(guildId, userId);
      await interaction.reply({
        embeds: [
          result.ok && result.pet
            ? successEmbed(
                `🍖 Kamu memberi makan **${result.pet.name}**. Hunger: ${result.pet.hunger}%.`,
              )
            : errorEmbed(result.error ?? "Gagal."),
        ],
        ephemeral: !result.ok,
      });
      return;
    }

    if (sub === "main") {
      const result = await playWithPet(guildId, userId);
      if (!result.ok || !result.pet) {
        await interaction.reply({
          embeds: [errorEmbed(result.error ?? "Gagal.")],
          ephemeral: true,
        });
        return;
      }
      const extra = result.leveledUp
        ? `\n🎉 **${result.pet.name}** naik ke level **${result.pet.level}**!`
        : "";
      await interaction.reply({
        embeds: [
          successEmbed(
            `🎾 Kamu main bareng **${result.pet.name}**! Happiness: ${result.pet.happiness}%.${extra}`,
          ),
        ],
      });
      return;
    }

    if (sub === "rename") {
      const nama = interaction.options.getString("nama", true);
      const result = await renamePet(guildId, userId, nama);
      await interaction.reply({
        embeds: [
          result.ok
            ? successEmbed(`Nama pet diganti jadi **${nama}**.`)
            : errorEmbed(result.error ?? "Gagal."),
        ],
        ephemeral: !result.ok,
      });
      return;
    }

    // status
    const pet = await getPet(guildId, userId);
    if (!pet) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu belum punya pet. Adopsi dengan `/pet adopsi`.")],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      embeds: [
        buildEmbed("primary")
          .setTitle(`${pet.species} ${pet.name}`)
          .addFields(
            {
              name: "Level",
              value: `${pet.level} (${pet.xp}/${xpForNextLevel(pet.level)} XP)`,
              inline: true,
            },
            { name: "🍖 Hunger", value: bar(pet.hunger) },
            { name: "😊 Happiness", value: bar(pet.happiness) },
          )
          .setFooter({ text: "Kasih makan & ajak main biar tetap sehat & bahagia!" }),
      ],
    });
  },
};

export default command;
