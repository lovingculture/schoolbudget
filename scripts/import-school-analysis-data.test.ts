import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importSchoolAnalysisData } from "./import-school-analysis-data.mjs";

const temporaryDirectories: string[] = [];
const validManifest = [
  { schoolName: "한빛중학교", schoolCode: "B100000002", fiscalYear: 2025, referenceMonth: "202603", file: "B100000002_2025_202603.json" },
  { schoolName: "가람초등학교", schoolCode: "B100000001", fiscalYear: 2025, referenceMonth: "202603", file: "B100000001_2025_202603.json" },
];
const validProfiles = {
  summary: { referenceYear: 2025 },
  profiles: [
    { schoolCode: "B100000001", schoolName: "가람초등학교", studentCount: 100 },
    { schoolCode: "B100000002", schoolName: "한빛중학교", studentCount: 200 },
  ],
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createSourceFixture() {
  const sourceRoot = await mkdtemp(path.join(tmpdir(), "school-analysis-source-"));
  const outputRoot = await mkdtemp(path.join(tmpdir(), "school-analysis-output-"));
  temporaryDirectories.push(sourceRoot, outputRoot);
  const dataRoot = path.join(sourceRoot, "school-budget", "data");
  const schoolsRoot = path.join(dataRoot, "fixtures", "schools");
  const profilesPath = path.join(dataRoot, "school-profiles", "school-profiles_2025.json");
  const manifestPath = path.join(dataRoot, "fixtures", "manifest.json");

  await Promise.all([
    mkdir(schoolsRoot, { recursive: true }),
    mkdir(path.dirname(profilesPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(manifestPath, JSON.stringify(validManifest)),
    writeFile(profilesPath, JSON.stringify(validProfiles)),
    ...validManifest.map((entry) => writeSchoolDataset(schoolsRoot, entry)),
  ]);

  return { sourceRoot, outputRoot, schoolsRoot, profilesPath, manifestPath };
}

async function writeSchoolDataset(
  schoolsRoot: string,
  entry: (typeof validManifest)[number],
  summary = entry,
) {
  await writeFile(
    path.join(schoolsRoot, entry.file),
    JSON.stringify({ summary, incomeRows: [], expenseRows: [] }),
  );
}

describe("importSchoolAnalysisData", () => {
  it("writes Korean-name-sorted school assets with matching profiles and no obsolete files", async () => {
    const fixture = await createSourceFixture();
    const outputSchoolsRoot = path.join(fixture.outputRoot, "schools");
    await mkdir(outputSchoolsRoot, { recursive: true });
    await writeFile(path.join(outputSchoolsRoot, "stale.json"), "{}");

    await importSchoolAnalysisData(fixture.sourceRoot, fixture.outputRoot);

    const manifest = JSON.parse(await readFile(path.join(fixture.outputRoot, "manifest.json"), "utf8"));
    const first = JSON.parse(await readFile(path.join(outputSchoolsRoot, "B100000001_2025_202603.json"), "utf8"));

    expect(manifest).toEqual([
      { schoolName: "가람초등학교", schoolCode: "B100000001", fiscalYear: 2025, referenceMonth: "202603", file: "B100000001_2025_202603.json" },
      { schoolName: "한빛중학교", schoolCode: "B100000002", fiscalYear: 2025, referenceMonth: "202603", file: "B100000002_2025_202603.json" },
    ]);
    expect(first.schoolProfile.schoolCode).toBe("B100000001");
    expect(first.summary.schoolCode).toBe("B100000001");
    expect((await readdir(outputSchoolsRoot)).sort()).toEqual([
      "B100000001_2025_202603.json",
      "B100000002_2025_202603.json",
    ]);
  });

  it("rejects a settlement record that is not fiscal year 2025", async () => {
    const fixture = await createSourceFixture();
    const non2025Entry = { ...validManifest[0], fiscalYear: 2024, file: "B100000002_202403.json" };
    await writeFile(fixture.manifestPath, JSON.stringify([non2025Entry, validManifest[1]]));
    await writeSchoolDataset(fixture.schoolsRoot, non2025Entry);

    await expect(importSchoolAnalysisData(fixture.sourceRoot, fixture.outputRoot))
      .rejects.toThrow("2025");
  });

  it("rejects a profile document from a year other than 2025", async () => {
    const fixture = await createSourceFixture();
    await writeFile(fixture.profilesPath, JSON.stringify({ ...validProfiles, summary: { referenceYear: 2024 } }));

    await expect(importSchoolAnalysisData(fixture.sourceRoot, fixture.outputRoot))
      .rejects.toThrow("2025");
  });

  it("rejects malformed manifests and duplicate settlement identifiers", async () => {
    const malformedFixture = await createSourceFixture();
    await writeFile(malformedFixture.manifestPath, JSON.stringify({ schools: validManifest }));
    await expect(importSchoolAnalysisData(malformedFixture.sourceRoot, malformedFixture.outputRoot))
      .rejects.toThrow("학교 목록은 배열이어야 합니다.");

    const duplicateFixture = await createSourceFixture();
    await writeFile(
      duplicateFixture.manifestPath,
      JSON.stringify([...validManifest, { ...validManifest[0], schoolName: "중복학교" }]),
    );
    await expect(importSchoolAnalysisData(duplicateFixture.sourceRoot, duplicateFixture.outputRoot))
      .rejects.toThrow("중복된 학교 자료 식별자입니다");
  });

  it("rejects duplicate profile codes and settlement identity mismatches", async () => {
    const duplicateProfileFixture = await createSourceFixture();
    await writeFile(
      duplicateProfileFixture.profilesPath,
      JSON.stringify({ ...validProfiles, profiles: [...validProfiles.profiles, validProfiles.profiles[0]] }),
    );
    await expect(importSchoolAnalysisData(duplicateProfileFixture.sourceRoot, duplicateProfileFixture.outputRoot))
      .rejects.toThrow("중복된 학교 기본정보 코드입니다");

    const mismatchFixture = await createSourceFixture();
    await writeSchoolDataset(mismatchFixture.schoolsRoot, validManifest[0], { ...validManifest[0], schoolCode: "B100000999" });
    await expect(importSchoolAnalysisData(mismatchFixture.sourceRoot, mismatchFixture.outputRoot))
      .rejects.toThrow("학교 결산자료 식별자가 목록과 일치하지 않습니다");
  });
});
