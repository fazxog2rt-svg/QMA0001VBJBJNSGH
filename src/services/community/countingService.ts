import type { Message } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";

export interface CountingResult {
  handled: boolean;
  correct?: boolean;
  expected?: number;
  reason?: "wrong-number" | "double-count";
}

/**
 * Proses pesan di channel counting. Member harus mengetik angka berikutnya secara
 * berurutan dan tidak boleh menghitung dua kali berturut-turut. Salah → reset ke 0.
 * Mengembalikan handled=false jika pesan bukan di channel counting.
 */
export async function handleCountingMessage(message: Message<true>): Promise<CountingResult> {
  const config = await GuildConfig.findOne({ guildId: message.guildId });
  const counting = config?.counting;
  if (!counting?.channelId || counting.channelId !== message.channelId) {
    return { handled: false };
  }

  const number = Number(message.content.trim());
  const expected = (counting.current ?? 0) + 1;

  // Bukan angka murni → abaikan (biarkan orang tetap bisa ngobrol angka campur teks? tidak,
  // channel counting harus ketat: pesan non-angka dianggap salah agar hitungan bersih).
  if (!Number.isInteger(number)) {
    return { handled: true, correct: false, expected, reason: "wrong-number" };
  }

  // Tidak boleh menghitung dua kali berturut-turut oleh orang yang sama.
  if (counting.lastUserId && counting.lastUserId === message.author.id) {
    await GuildConfig.updateOne(
      { guildId: message.guildId },
      { $set: { "counting.current": 0, "counting.lastUserId": null } },
    );
    return { handled: true, correct: false, expected, reason: "double-count" };
  }

  if (number !== expected) {
    await GuildConfig.updateOne(
      { guildId: message.guildId },
      { $set: { "counting.current": 0, "counting.lastUserId": null } },
    );
    return { handled: true, correct: false, expected, reason: "wrong-number" };
  }

  // Benar: naikkan hitungan & update high score.
  const newHigh = Math.max(counting.highScore ?? 0, number);
  await GuildConfig.updateOne(
    { guildId: message.guildId },
    {
      $set: {
        "counting.current": number,
        "counting.lastUserId": message.author.id,
        "counting.highScore": newHigh,
      },
    },
  );

  return { handled: true, correct: true, expected: number };
}
