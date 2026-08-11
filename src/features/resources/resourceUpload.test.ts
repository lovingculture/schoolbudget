import { describe, expect, it } from "vitest";
import { validateResourceInput } from "./resourceValidation";
import { canonicalMimeForFilename, RESOURCE_UPLOAD_MIME_TYPES } from "./resourceUpload";

function resourceFile(name: string, type: string) {
  return new File(["resource"], name, { type });
}

describe("canonicalMimeForFilename", () => {
  it("normalizes a legacy XLS browser MIME alias to the bucket MIME type", () => {
    const file = resourceFile("budget.XLS", "application/excel");

    expect(validateResourceInput({ title: "자료", category: "guide", schoolYear: 2026, file })).toEqual([]);
    expect(canonicalMimeForFilename(file.name)).toBe("application/vnd.ms-excel");
  });

  it("normalizes HWP and HWPX browser MIME aliases or an empty browser MIME by extension", () => {
    const files = [
      [resourceFile("guide.HWP", "application/x-hwp"), "application/haansofthwp"],
      [resourceFile("guide.hwpx", "application/x-hwpx"), "application/hwp+zip"],
      [resourceFile("guide.HWP", ""), "application/haansofthwp"],
      [resourceFile("guide.HWPX", ""), "application/hwp+zip"],
    ] as const;

    for (const [file, expectedMime] of files) {
      expect(validateResourceInput({ title: "자료", category: "guide", schoolYear: 2026, file })).toEqual([]);
      expect(canonicalMimeForFilename(file.name)).toBe(expectedMime);
    }
  });

  it("uses the bucket's octet-stream fallback when the filename has no known extension", () => {
    expect(canonicalMimeForFilename("resource")).toBe("application/octet-stream");
  });

  it("has the same complete canonical MIME set as the bucket contract", () => {
    const canonicalSet = [
      "resource.pdf",
      "resource.xls",
      "resource.xlsx",
      "resource.docx",
      "resource.hwp",
      "resource.hwpx",
      "resource",
    ].map(canonicalMimeForFilename);

    expect(canonicalSet).toEqual(RESOURCE_UPLOAD_MIME_TYPES);
  });
});
