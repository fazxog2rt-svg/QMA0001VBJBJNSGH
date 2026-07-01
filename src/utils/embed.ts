import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../config/constants";

type EmbedVariant = keyof typeof EMBED_COLORS;

export function buildEmbed(variant: EmbedVariant = "primary"): EmbedBuilder {
  return new EmbedBuilder().setColor(EMBED_COLORS[variant]).setTimestamp();
}

export function successEmbed(description: string): EmbedBuilder {
  return buildEmbed("success").setDescription(`✅ ${description}`);
}

export function errorEmbed(description: string): EmbedBuilder {
  return buildEmbed("danger").setDescription(`❌ ${description}`);
}

export function warningEmbed(description: string): EmbedBuilder {
  return buildEmbed("warning").setDescription(`⚠️ ${description}`);
}
