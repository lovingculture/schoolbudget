import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importSchoolAnalysisData } from "./import-school-analysis-data.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("importSchoolAnalysisData", () => {
  it("validates source records and writes Korean-name-sorted school assets with matching profiles", async () => {
    const sourceRoot = await mkdtemp(path.join(tmpdir(), "school-analysis-source-"));
    const outputRoot = await mkdtemp(path.join(tmpdir(), "school-analysis-output-"));
    temporaryDirectories.push(sourceRoot, outputRoot);
    const dataRoot = path.join(sourceRoot, "school-budget", "data");
    const schoolsRoot = path.join(dataRoot, "fixtures", "schools");

    await Promise.all([
      mkdir(schoolsRoot, { recursive: true }),
      mkdir(path.join(dataRoot, "school-profiles"), { recursive: true }),
    ]);

    await Promise.all([
      writeFile(
        path.join(dataRoot, "fixtures", "manifest.json"),
        JSON.stringify([
          { schoolName: "한빛중학교", schoolCode: "B100000002", fiscalYear: 2025, referenceMonth: "202603", file: "B100000002_2025_202603.json" },
          { schoolName: "가람초등학교", schoolCode: "B100000001", fiscalYear: 2025, referenceMonth: "202603", file: "B100000001_2025_202603.json" },
        ]),
      ),
      writeFile(
        path.join(dataRoot, "school-profiles", "school-profiles_2025.json"),
        JSON.stringify({
          summary: { referenceYear: 2025 },
          profiles: [
            { schoolCode: "B100000001", schoolName: "가람초등학교", studentCount: 100 },
            { schoolCode: "B100000002", schoolName: "한빛중학교", studentCount: 200 },
          ],
        }),
      ),
      writeFile(
        path.join(schoolsRoot, "B100000002_2025_202603.json"),
        JSON.stringify({ summary: { schoolName: "한빛중학교", schoolCode: "B100000002", fiscalYear: 2025, referenceMonth: "202603" }, incomeRows: [], expenseRows: [] }),
      ),
      writeFile(
        path.join(schoolsRoot, "B100000001_2025_202603.json"),
        JSON.stringify({ summary: { schoolName: "가람초등학교", schoolCode: "B100000001", fiscalYear: 2025, referenceMonth: "202603" }, incomeRows: [], expenseRows: [] }),
      ),
    ]);

    await importSchoolAnalysisData(sourceRoot, outputRoot);

    const manifest = JSON.parse(await readFile(path.join(outputRoot, "manifest.json"), "utf8"));
    const first = JSON.parse(await readFile(path.join(outputRoot, "schools", "B100000001_2025_202603.json"), "utf8"));

    expect(manifest).toEqual([
      { schoolName: "가람초등학교", schoolCode: "B100000001", fiscalYear: 2025, referenceMonth: "202603", file: "B100000001_2025_202603.json" },
      { schoolName: "한빛중학교", schoolCode: "B100000002", fiscalYear: 2025, referenceMonth: "202603", file: "B100000002_2025_202603.json" },
    ]);
    expect(first.schoolProfile.schoolCode).toBe("B100000001");
    expect(first.summary.schoolCode).toBe("B100000001");
    await expect(readdir(path.join(outputRoot, "schools"))).resolves.toEqual([
      "B100000001_2025_202603.json",
      "B100000002_2025_202603.json",
    ]);
  });
});
