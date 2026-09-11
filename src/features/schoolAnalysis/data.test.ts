import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSchoolAnalysisCache,
  loadSchoolDataset,
  loadSchoolManifest,
} from "./data";
import type { BudgetDataset, SchoolManifestEntry } from "./types";

const entry: SchoolManifestEntry = {
  schoolName: "테스트학교",
  schoolCode: "B100000001",
  fiscalYear: 2025,
  referenceMonth: "202603",
  file: "학교 자료 (2025).json",
};

const dataset: BudgetDataset = {
  schoolProfile: null,
  summary: {
    schoolCode: entry.schoolCode,
    schoolName: entry.schoolName,
    fiscalYear: entry.fiscalYear,
    referenceMonth: entry.referenceMonth,
    budgetAmount: 100,
    currentBudget: 90,
    incomeSettlement: 80,
    expenseSettlement: 70,
    surplus: 10,
    note: "",
    collectionStatus: "수집완료",
    sourceUrl: "https://example.com/school",
  },
  incomeRows: [{
    schoolCode: entry.schoolCode,
    schoolName: entry.schoolName,
    fiscalYear: entry.fiscalYear,
    referenceMonth: entry.referenceMonth,
    sourceBundleNumber: 1,
    duplicateBundleCount: 1,
    sourceRowNumber: 1,
    rowType: "합계",
    chapter: "세입합계",
    section: "세입합계",
    subsection: "세입합계",
    item: "세입합계",
    budgetAmount: 100,
    currentBudget: 90,
    settlementAmount: 80,
    difference: 10,
    sourceUrl: "https://example.com/income",
  }],
  expenseRows: [{
    schoolCode: entry.schoolCode,
    schoolName: entry.schoolName,
    fiscalYear: entry.fiscalYear,
    referenceMonth: entry.referenceMonth,
    sourceBundleNumber: 1,
    duplicateBundleCount: 1,
    sourceRowNumber: 1,
    rowType: "합계",
    policyProgram: "세출합계",
    unitProgram: "세출합계",
    detailProgram: "세출합계",
    lineItem: "세출합계",
    budgetAmount: 100,
    currentBudget: 90,
    settlementAmount: 70,
    difference: 20,
    sourceUrl: "https://example.com/expense",
  }],
  findings: [],
  collectedAt: "2026-09-11T00:00:00.000Z",
};

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  clearSchoolAnalysisCache();
});

describe("school analysis data loaders", () => {
  it("caches the school manifest across repeated loads", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([entry]));

    const first = await loadSchoolManifest(fetcher);
    const second = await loadSchoolManifest(fetcher);

    expect(first).toBe(second);
    expect(first).toEqual([entry]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/data/school-analysis/manifest.json");
  });

  it("caches a selected school dataset and encodes its file URL", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(dataset));

    const first = await loadSchoolDataset(entry, fetcher);
    const second = await loadSchoolDataset(entry, fetcher);

    expect(first).toBe(second);
    expect(first).toEqual(dataset);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/data/school-analysis/schools/%ED%95%99%EA%B5%90%20%EC%9E%90%EB%A3%8C%20(2025).json",
    );
  });

  it("evicts a failed dataset request so the next load can retry", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ error: "unavailable" }, 503))
      .mockResolvedValueOnce(jsonResponse(dataset));

    await expect(loadSchoolDataset(entry, fetcher)).rejects.toThrow(
      "선택한 학교의 결산자료를 불러오지 못했습니다.",
    );

    const retried = await loadSchoolDataset(entry, fetcher);

    expect(retried).toEqual(dataset);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an object instead of an array", { error: "temporary manifest problem" }],
    ["an invalid entry", [{ ...entry, schoolName: 17 }]],
  ])("rejects %s and fetches a valid manifest on retry", async (_label, invalidManifest) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(invalidManifest))
      .mockResolvedValueOnce(jsonResponse([entry]));

    await expect(loadSchoolManifest(fetcher)).rejects.toThrow(
      "학교 목록을 불러오지 못했습니다.",
    );
    await expect(loadSchoolManifest(fetcher)).resolves.toEqual([entry]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed selected-school data and fetches it again on retry", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        ...dataset,
        summary: { ...dataset.summary, currentBudget: "not a number" },
      }))
      .mockResolvedValueOnce(jsonResponse(dataset));

    await expect(loadSchoolDataset(entry, fetcher)).rejects.toThrow(
      "선택한 학교의 결산자료를 불러오지 못했습니다.",
    );
    await expect(loadSchoolDataset(entry, fetcher)).resolves.toEqual(dataset);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("localizes raw fetch failures while retaining the diagnostic cause", async () => {
    const failure = new TypeError("Failed to fetch");
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(failure);

    const rejected = loadSchoolManifest(fetcher);
    await expect(rejected).rejects.toThrow("학교 목록을 불러오지 못했습니다.");
    await expect(rejected).rejects.toMatchObject({ cause: failure });
  });
});
