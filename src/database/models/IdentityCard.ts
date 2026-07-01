import { Schema, model, type InferSchemaType } from "mongoose";

const historyEntrySchema = new Schema(
  {
    field: { type: String, required: true },
    oldValue: { type: String },
    newValue: { type: String },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const identityCardSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    nomorIdentitas: { type: String, required: true, unique: true },

    nama: { type: String, required: true, maxlength: 100 },
    nik: { type: String, required: true, maxlength: 32 },
    tempatLahir: { type: String, required: true },
    tanggalLahir: { type: Date, required: true },
    jenisKelamin: { type: String, enum: ["Laki-laki", "Perempuan"], required: true },
    agama: {
      type: String,
      enum: ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"],
      required: true,
    },
    statusPerkawinan: {
      type: String,
      enum: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"],
      required: true,
    },
    pekerjaan: { type: String, required: true },
    alamat: { type: String, required: true },
    kecamatan: { type: String, required: true },
    kabupaten: { type: String, required: true },
    provinsi: { type: String, required: true },
    kodePos: { type: String, required: true },
    kewarganegaraan: { type: String, default: "WNI" },

    photoUrl: { type: String },
    qrCodeData: { type: String },
    barcodeData: { type: String },
    cardImageUrl: { type: String },
    cardPdfUrl: { type: String },
    theme: { type: String, default: "default" },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },

    history: { type: [historyEntrySchema], default: [] },

    issuedAt: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
  },
  { timestamps: true },
);

identityCardSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export type IdentityCardDocument = InferSchemaType<typeof identityCardSchema>;

export const IdentityCard = model<IdentityCardDocument>("IdentityCard", identityCardSchema);
