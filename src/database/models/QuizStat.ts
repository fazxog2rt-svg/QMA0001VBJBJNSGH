import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Statistik kuis "Cerdas Cermat" per member (all-time). Dipakai untuk papan
 * peringkat guild. Poin diakumulasi dari tiap sesi kuis langsung di channel.
 */
const quizStatSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    points: { type: Number, default: 0, min: 0 }, // total poin sepanjang masa
    correctAnswers: { type: Number, default: 0, min: 0 },
    gamesPlayed: { type: Number, default: 0, min: 0 },
    bestStreak: { type: Number, default: 0, min: 0 }, // rentetan benar terpanjang
  },
  { timestamps: true },
);

quizStatSchema.index({ guildId: 1, userId: 1 }, { unique: true });
// Untuk papan peringkat: urut poin tertinggi per guild.
quizStatSchema.index({ guildId: 1, points: -1 });

export type QuizStatDocument = InferSchemaType<typeof quizStatSchema>;
export const QuizStat = model<QuizStatDocument>("QuizStat", quizStatSchema);
