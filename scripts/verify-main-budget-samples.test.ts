import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("verify-main-budget-samples", () => {
  it("reaches production validation when global File is unavailable", () => {
    const samplePath = join(tmpdir(), `main-budget-node18-${process.pid}-${Date.now()}.pdf`);
    writeFileSync(samplePath, "%PDF-not-a-complete-document");

    try {
      const bootstrap = [
        'await import("vite");',
        "delete globalThis.File;",
        `process.argv = [process.execPath, "scripts/verify-main-budget-samples.mjs", "--", ${JSON.stringify(samplePath)}];`,
        'await import("./scripts/verify-main-budget-samples.mjs");',
      ].join(" ");
      const run = spawnSync(process.execPath, ["--input-type=module", "--eval", bootstrap], {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 30_000,
      });
      const output = `${run.stdout}\n${run.stderr}`;

      expect(run.status).toBe(1);
      expect(output).toContain("손상되었거나 지원하지 않는 PDF 파일");
      expect(output).not.toContain("File is not defined");
    } finally {
      unlinkSync(samplePath);
    }
  }, 35_000);
});
