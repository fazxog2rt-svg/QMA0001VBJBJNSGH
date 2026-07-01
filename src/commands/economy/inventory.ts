import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getOrCreateMember } from "../../services/profile/profileService";
import { ShopItem } from "../../database/models/ShopItem";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Lihat inventory item milikmu.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Lihat inventory member lain."),
    ),
  category: "economy",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = await getOrCreateMember(interaction.guildId, target.id);

    if (member.inventory.length === 0) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            target.id === interaction.user.id
              ? "Inventory-mu kosong."
              : "Inventory member ini kosong.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const items = await ShopItem.find({ guildId: interaction.guildId });
    const nameByKey = new Map(items.map((item) => [item.itemKey, item.name]));

    const lines = member.inventory.map(
      (entry) => `• **${nameByKey.get(entry.itemKey) ?? entry.itemKey}** ×${entry.quantity}`,
    );

    await interaction.reply({
      embeds: [
        buildEmbed("premium")
          .setTitle(`🎒 Inventory ${target.username}`)
          .setDescription(lines.join("\n")),
      ],
    });
  },
};

export default command;
