/**
 * Kategori motivasi harian. Setiap kategori punya prompt AI (untuk variasi yang
 * terasa alami) dan bank kutipan fallback bila AI tidak dikonfigurasi/gagal.
 */
export const MOTIVATION_CATEGORIES = {
  islami: {
    label: "Islami",
    emoji: "🕌",
    prompt:
      "Tuliskan satu pesan motivasi Islami yang menyejukkan hati dalam Bahasa Indonesia (2-4 kalimat). Boleh mengutip nilai kesabaran, syukur, atau tawakal. Jangan menyebut bahwa ini dibuat otomatis. Tulis seperti seseorang yang tulus berbagi.",
    fallback: [
      "Sabar itu bukan berarti diam, tapi tetap melangkah sambil percaya bahwa Allah punya rencana terbaik. 🤲",
      "Jangan lelah berdoa. Kadang jawaban terbaik datang di waktu yang tak kita duga. 🌙",
      "Rezeki tak akan tertukar. Fokus jadi versi terbaik dirimu, sisanya biar Allah yang atur. ✨",
      "Setiap kesulitan pasti ada kemudahan. Peluk hari ini dengan syukur. 🌸",
    ],
  },
  kehidupan: {
    label: "Kehidupan",
    emoji: "🌱",
    prompt:
      "Tuliskan satu pesan motivasi tentang kehidupan sehari-hari dalam Bahasa Indonesia (2-4 kalimat). Hangat, membumi, bikin semangat. Jangan menyebut bahwa ini dibuat otomatis.",
    fallback: [
      "Nggak apa-apa jalan pelan, yang penting nggak berhenti. Progress tetap progress. 🌿",
      "Hari ini nggak harus sempurna, cukup lebih baik sedikit dari kemarin. 💪",
      "Kadang kamu nggak butuh motivasi, cuma butuh istirahat. Itu juga produktif kok. ☕",
      "Bandingkan dirimu dengan dirimu yang kemarin, bukan dengan orang lain. Kamu lagi bertumbuh. 🌻",
    ],
  },
  depresi: {
    label: "Untuk yang sedang berat",
    emoji: "🫂",
    prompt:
      "Tuliskan satu pesan penuh empati dan menenangkan untuk seseorang yang sedang merasa down atau depresi, dalam Bahasa Indonesia (2-4 kalimat). Lembut, tidak menghakimi, tidak menggurui. Ingatkan bahwa mereka tidak sendirian. JANGAN memberi nasihat medis. Jangan menyebut bahwa ini dibuat otomatis.",
    fallback: [
      "Kalau hari ini cuma kuat buat bertahan, itu udah cukup. Kamu nggak sendirian. 🫂",
      "Perasaanmu valid. Boleh capek, boleh nangis. Pelan-pelan aja, satu napas dalam satu waktu. 💙",
      "Kamu udah melewati 100% hari-hari terberatmu sampai sekarang. Itu bukti kamu kuat. 🌧️→🌈",
      "Nggak apa-apa nggak baik-baik aja hari ini. Besok kita coba lagi, bareng-bareng. 🤍",
    ],
  },
  bebas: {
    label: "Generate Bebas",
    emoji: "🎲",
    prompt:
      "Tuliskan satu pesan motivasi singkat bertema bebas (boleh soal mimpi, kerja keras, pertemanan, atau semangat) dalam Bahasa Indonesia (2-4 kalimat), gaya santai anak muda Indonesia. Jangan menyebut bahwa ini dibuat otomatis.",
    fallback: [
      "Mimpimu nggak kegedean kok, usahamu aja yang perlu ditambah dikit lagi. Gaskeun! 🚀",
      "Orang hebat juga dulunya pemula yang nggak nyerah. Kamu lagi di prosesnya. 🔥",
      "Sekali lagi. Coba sekali lagi. Biasanya keajaiban ada di percobaan yang hampir kamu lewatin. ✨",
      "Kelilingi dirimu sama orang yang bikin kamu tumbuh, bukan yang bikin kamu ragu. 🌟",
    ],
  },
} as const;

export type MotivationCategory = keyof typeof MOTIVATION_CATEGORIES;

export function isMotivationCategory(value: string): value is MotivationCategory {
  return value in MOTIVATION_CATEGORIES;
}
