import { Schema, model, type InferSchemaType } from "mongoose";

const backedUpRoleSchema = new Schema(
  {
    originalRoleId: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: Number, required: true },
    permissions: { type: String, required: true },
    position: { type: Number, required: true },
    hoist: { type: Boolean, default: false },
    mentionable: { type: Boolean, default: false },
  },
  { _id: false },
);

const roleBackupSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
    roles: { type: [backedUpRoleSchema], default: [] },
  },
  { timestamps: true },
);

export type RoleBackupDocument = InferSchemaType<typeof roleBackupSchema>;

export const RoleBackup = model<RoleBackupDocument>("RoleBackup", roleBackupSchema);
