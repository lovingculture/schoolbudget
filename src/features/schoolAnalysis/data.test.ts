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
  incomeRows: [],
  expenseRows: [],
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
});
