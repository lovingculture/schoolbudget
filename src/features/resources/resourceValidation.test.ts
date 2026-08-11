import { describe, expect, it } from "vitest";
import { validateResourceInput } from "./resourceValidation";

function resourceFile(name: string, size = 1024, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateResourceInput", () => {
  it("rejects a missing title", () => {
    expect(validateResourceInput({ title: "", category: "guide", schoolYear: 2026, file: resourceFile("guide.pdf") })).toEqual([
      "자료 제목을 입력하세요.",
    ]);
  });

  it("rejects files larger than 30MB", () => {
    expect(validateResourceInput({ title: "자료", category: "guide", schoolYear: 2026, file: resourceFile("guide.pdf", 30 * 1024 * 1024 + 1) })).toContain(
      "파일은 30MB 이하만 등록할 수 있습니다.",
    );
  });

  it("rejects a disallowed filename extension", () => {
    expect(validateResourceInput({ title: "자료", category: "guide", schoolYear: 2026, file: resourceFile("guide.exe", 1024, "application/octet-stream") })).toContain(
      "PDF, XLS, XLSX, DOCX, HWP, HWPX 파일만 등록할 수 있습니다.",
    );
  });

  it("rejects a PDF filename with an incompatible MIME type", () => {
    expect(validateResourceInput({ title: "자료", category: "guide", schoolYear: 2026, file: resourceFile("guide.pdf", 1024, "application/octet-stream") })).toContain(
      "PDF, XLS, XLSX, DOCX, HWP, HWPX 파일만 등록할 수 있습니다.",
    );
  });

  it("accepts an HWPX filename even when its MIME type is unavailable", () => {
    expect(validateResourceInput({ title: "자료", category: "reference", schoolYear: 2026, file: resourceFile("guide.HWPX", 1024, "") })).toEqual([]);
  });
});
