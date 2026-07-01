import { Schema, model } from "mongoose";

const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = model("Counter", counterSchema);

/** Atomically increments and returns the next sequence number for a given key. */
export async function getNextSequence(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return counter.seq;
}
