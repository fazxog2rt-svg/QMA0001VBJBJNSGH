import { describe, expect, it } from "vitest";
import { JOBS, getJob } from "../src/config/jobs";

describe("getJob", () => {
  it("menemukan pekerjaan berdasarkan key", () => {
    const job = getJob("programmer");
    expect(job?.label).toBe("Programmer");
    expect(job?.min).toBeLessThanOrEqual(job!.max);
  });

  it("mengembalikan undefined untuk key tidak dikenal / kosong", () => {
    expect(getJob("tidak-ada")).toBeUndefined();
    expect(getJob(null)).toBeUndefined();
    expect(getJob(undefined)).toBeUndefined();
  });

  it("semua pekerjaan punya rentang gaji valid", () => {
    for (const job of JOBS) {
      expect(job.min).toBeGreaterThan(0);
      expect(job.max).toBeGreaterThanOrEqual(job.min);
    }
  });
});
