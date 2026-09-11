import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { importSchoolAnalysisData } from "./import-school-analysis-data.mjs";
import {
  validateBudgetDataset,
  validateSchoolManifest,
} from "../src/features/schoolAnalysis/validation.js";

const temporaryDirectories: string[] = [];
const validManifest = [
  { schoolName: "한빛중학교", schoolCode: "B100000002", fiscalYear: 2025, referenceMonth: "202603", file: "B100000002_2025_202603.json" },
  { schoolName: "가람초등학교", schoolCode: "B100000001", fiscalYear: 2025, referenceMonth: "202603", file: "B100000001_2025_202603.json" },
];
const validProfiles = {
  summary: { referenceYear: 2025 },
  profiles: [
    {
      schoolCode: "B100000001",
      disclosureSchoolCode: "S100000001",
      schoolName: "가람초등학교",
      referenceYear: 2025,
      studentCount: 100,
      siteAreaM2: 1_000,
      buildingGrossAreaM2: null,
      linkageBasis: "same-year+unique-code-suffix+exact-name",
    },
    {
      schoolCode: "B100000002",
      disclosureSchoolCode: "S100000002",
      schoolName: "한빛중학교",
      referenceYear: 2025,
      studentCount: 200,
      siteAreaM2: 2_000,
      buildingGrossAreaM2: null,
      linkageBasis: "same-year+unique-code-suffix+exact-name",
    },
  ],
};

function schoolPeriod(entry: (typeof validManifest)[number]) {
  return {
    schoolName: entry.schoolName,
    schoolCode: entry.schoolCode,
    fiscalYear: entry.fiscalYear,
    referenceMonth: entry.referenceMonth,
  };
}

function sourceAmounts(entry: (typeof validManifest)[number], sourceRowNumber: number) {
  return {
    ...schoolPeriod(entry),
    sourceBundleNumber: 1,
    duplicateBundleCount: 1,
    sourceRowNumber,
    budgetAmount: 100,
    currentBudget: 90,
    settlementAmount: 80,
    difference: 10,
    sourceUrl: "https://example.com/source",
  };
}

function validDataset(entry: (typeof validManifest)[number]) {
  return {
    summary: {
      ...schoolPeriod(entry),
      budgetAmount: 100,
      currentBudget: 90,
      incomeSettlement: 80,
      expenseSettlement: 70,
      surplus: 10,
      note: "",
      collectionStatus: "수집완료",
      sourceUrl: "https://example.com/summary",
    },
    incomeRows: [
      {
        ...sourceAmounts(entry, 1),
        rowType: "목상세",
        chapter: "이전수입",
        section: "교육청이전수입",
        subsection: "학교운영비",
        item: "기본운영비",
      },
      {
        ...sourceAmounts(entry, 2),
        rowType: "합계",
        chapter: "세입합계",
        section: "세입합계",
        subsection: "세입합계",
        item: "세입합계",
      },
    ],
    expenseRows: [
      {
        ...sourceAmounts(entry, 1),
        rowType: "세부항목상세",
        policyProgram: "학교교육",
        unitProgram: "교육활동",
        detailProgram: "교과활동",
        lineItem: "교재비",
      },
      {
        ...sourceAmounts(entry, 2),
        rowType: "합계",
        policyProgram: "세출합계",
        unitProgram: "세출합계",
        detailProgram: "세출합계",
        lineItem: "세출합계",
      },
    ],
    findings: [],
    collectedAt: "2026-09-11T00:00:00.000Z",
  };
}

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
  dataset: Record<string, unknown> = validDataset(entry),
) {
  await writeFile(
    path.join(schoolsRoot, entry.file),
    JSON.stringify(dataset),
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
    const mismatchDataset = validDataset(validManifest[0]);
    mismatchDataset.summary.schoolCode = "B100000999";
    await writeSchoolDataset(mismatchFixture.schoolsRoot, validManifest[0], mismatchDataset);
    await expect(importSchoolAnalysisData(mismatchFixture.sourceRoot, mismatchFixture.outputRoot))
      .rejects.toThrow("학교 결산자료 식별자가 목록과 일치하지 않습니다");
  });

  it.each([
    ["non-numeric summary amounts", (dataset: ReturnType<typeof validDataset>) => {
      (dataset.summary.currentBudget as unknown) = "not a number";
    }],
    ["unsafe row amounts", (dataset: ReturnType<typeof validDataset>) => {
      dataset.incomeRows[0].currentBudget = Number.MAX_SAFE_INTEGER + 1;
    }],
  ])("rejects %s", async (_label, corrupt) => {
    const fixture = await createSourceFixture();
    const dataset = validDataset(validManifest[0]);
    corrupt(dataset);
    await writeSchoolDataset(fixture.schoolsRoot, validManifest[0], dataset);

    await expect(importSchoolAnalysisData(fixture.sourceRoot, fixture.outputRoot))
      .rejects.toThrow(/금액/);
  });

  it("rejects missing hierarchy fields, invalid row types, and row-school mismatches", async () => {
    const missingHierarchy = await createSourceFixture();
    const missingDataset = validDataset(validManifest[0]);
    delete (missingDataset.expenseRows[0] as Partial<typeof missingDataset.expenseRows[number]>).detailProgram;
    await writeSchoolDataset(missingHierarchy.schoolsRoot, validManifest[0], missingDataset);
    await expect(importSchoolAnalysisData(missingHierarchy.sourceRoot, missingHierarchy.outputRoot))
      .rejects.toThrow(/계층/);

    const invalidType = await createSourceFixture();
    const invalidTypeDataset = validDataset(validManifest[0]);
    invalidTypeDataset.incomeRows[0].rowType = "임의행";
    await writeSchoolDataset(invalidType.schoolsRoot, validManifest[0], invalidTypeDataset);
    await expect(importSchoolAnalysisData(invalidType.sourceRoot, invalidType.outputRoot))
      .rejects.toThrow(/행 구분/);

    const mismatch = await createSourceFixture();
    const mismatchDataset = validDataset(validManifest[0]);
    mismatchDataset.incomeRows[0].schoolCode = "B100000999";
    await writeSchoolDataset(mismatch.schoolsRoot, validManifest[0], mismatchDataset);
    await expect(importSchoolAnalysisData(mismatch.sourceRoot, mismatch.outputRoot))
      .rejects.toThrow(/학교·기간/);
  });

  it("rejects duplicate source identities and missing or duplicate bundle totals", async () => {
    const duplicateRow = await createSourceFixture();
    const duplicateRowDataset = validDataset(validManifest[0]);
    duplicateRowDataset.expenseRows.splice(1, 0, { ...duplicateRowDataset.expenseRows[0] });
    await writeSchoolDataset(duplicateRow.schoolsRoot, validManifest[0], duplicateRowDataset);
    await expect(importSchoolAnalysisData(duplicateRow.sourceRoot, duplicateRow.outputRoot))
      .rejects.toThrow(/중복 원문 행/);

    const missingTotal = await createSourceFixture();
    const missingTotalDataset = validDataset(validManifest[0]);
    missingTotalDataset.incomeRows = missingTotalDataset.incomeRows.filter((row) => row.rowType !== "합계");
    await writeSchoolDataset(missingTotal.schoolsRoot, validManifest[0], missingTotalDataset);
    await expect(importSchoolAnalysisData(missingTotal.sourceRoot, missingTotal.outputRoot))
      .rejects.toThrow(/합계 행/);

    const duplicateTotal = await createSourceFixture();
    const duplicateTotalDataset = validDataset(validManifest[0]);
    duplicateTotalDataset.expenseRows.push({
      ...duplicateTotalDataset.expenseRows[1],
      sourceRowNumber: 3,
    });
    await writeSchoolDataset(duplicateTotal.schoolsRoot, validManifest[0], duplicateTotalDataset);
    await expect(importSchoolAnalysisData(duplicateTotal.sourceRoot, duplicateTotal.outputRoot))
      .rejects.toThrow(/합계 행/);
  });

  it.each([
    ["name", { schoolName: "다른학교" }],
    ["year", { referenceYear: 2024 }],
  ])("rejects a linked profile with a mismatched %s", async (_label, profilePatch) => {
    const fixture = await createSourceFixture();
    await writeFile(
      fixture.profilesPath,
      JSON.stringify({
        ...validProfiles,
        profiles: validProfiles.profiles.map((profile) =>
          profile.schoolCode === validManifest[0].schoolCode
            ? { ...profile, ...profilePatch }
            : profile,
        ),
      }),
    );

    await expect(importSchoolAnalysisData(fixture.sourceRoot, fixture.outputRoot))
      .rejects.toThrow(/학교 기본정보.*일치/);
  });

  it("keeps valid missing summary amounts and validates all 1,653 committed assets", async () => {
    const fixture = await createSourceFixture();
    const missingSummary = validDataset(validManifest[0]);
    Object.assign(missingSummary.summary, {
      budgetAmount: null,
      currentBudget: null,
      incomeSettlement: null,
      expenseSettlement: null,
      surplus: null,
    });
    await writeSchoolDataset(fixture.schoolsRoot, validManifest[0], missingSummary);
    await expect(importSchoolAnalysisData(fixture.sourceRoot, fixture.outputRoot)).resolves.toHaveLength(2);

    const publicRoot = path.join(process.cwd(), "public", "data", "school-analysis");
    const manifest = validateSchoolManifest(JSON.parse(await readFile(path.join(publicRoot, "manifest.json"), "utf8")));
    expect(manifest).toHaveLength(1653);
    for (const entry of manifest) {
      const value = JSON.parse(readFileSync(path.join(publicRoot, "schools", entry.file), "utf8"));
      expect(validateBudgetDataset(value, entry)).toBe(value);
    }
  }, 30_000);
});
