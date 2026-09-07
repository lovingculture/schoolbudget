import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("diagnose-main-budget-ocr", () => {
  it("accepts source paths only from the CLI and always returns the diagnostic JSON contract", () => {
    const script = readFileSync("scripts/diagnose-main-budget-ocr.mjs", "utf8");
    expect(script).not.toMatch(/Desktop|2026\uD559\uB144\uB3C4 \uD559\uAD50\uD68C\uACC4|2026\uD559\uB144\uB3C4 \uC720\uCE58\uC6D0\uD68C\uACC4/);

    const samplePath = join(tmpdir(), `main-budget-diagnostic-${process.pid}-${Date.now()}.pdf`);
    writeFileSync(samplePath, "%PDF-not-a-complete-document");
    try {
      const run = spawnSync(process.execPath, ["scripts/diagnose-main-budget-ocr.mjs", "--", samplePath], {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 60_000,
      });
      expect(run.status).toBe(1);
      const report = JSON.parse(run.stdout.trim());
      expect(report).toEqual(expect.objectContaining({
        pages: expect.any(Array),
        summary: expect.any(Object),
        revenue: expect.any(Object),
        expenditure: expect.any(Object),
        fatalReason: expect.any(String),
      }));
    } finally {
      unlinkSync(samplePath);
    }
  }, 65_000);
});
