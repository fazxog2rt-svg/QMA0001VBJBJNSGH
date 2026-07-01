import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
} from "discord.js";

const PAGINATION_TIMEOUT_MS = 120_000;

function buildNavigationRow(
  currentPage: number,
  totalPages: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("pagination:first")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("pagination:previous")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("pagination:next")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder()
      .setCustomId("pagination:last")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
  );
}

export async function paginateEmbeds(
  interaction: ChatInputCommandInteraction,
  embeds: EmbedBuilder[],
): Promise<void> {
  if (embeds.length === 0) return;

  if (embeds.length === 1) {
    await interaction.editReply({ embeds: [embeds[0]!] });
    return;
  }

  let currentPage = 0;
  const message = await interaction.editReply({
    embeds: [embeds[0]!],
    components: [buildNavigationRow(currentPage, embeds.length)],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: PAGINATION_TIMEOUT_MS,
    filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,
  });

  collector.on("collect", async (buttonInteraction) => {
    if (buttonInteraction.customId === "pagination:first") currentPage = 0;
    if (buttonInteraction.customId === "pagination:previous")
      currentPage = Math.max(0, currentPage - 1);
    if (buttonInteraction.customId === "pagination:next")
      currentPage = Math.min(embeds.length - 1, currentPage + 1);
    if (buttonInteraction.customId === "pagination:last") currentPage = embeds.length - 1;

    await buttonInteraction.update({
      embeds: [embeds[currentPage]!],
      components: [buildNavigationRow(currentPage, embeds.length)],
    });
  });

  collector.on("end", async () => {
    await interaction.editReply({ components: [] }).catch(() => undefined);
  });
}
