import { describe, expect, it } from "vitest";
import { decodeBudgetCsv } from "./decodeCsv";

function base64Bytes(value: string): ArrayBuffer {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)).buffer;
}

describe("decodeBudgetCsv", () => {
  it("prefers UTF-8 when Korean headings decode cleanly", () => {
    const bytes = new TextEncoder().encode("2026학년도 세입예산명세서\r\n2026학년도 세출예산명세서").buffer;
    expect(decodeBudgetCsv(bytes)).toMatchObject({
      encoding: "utf-8",
      text: expect.stringContaining("세입예산명세서"),
    });
  });

  it("decodes a CP949 budget heading without replacement characters", () => {
    const bytes = base64Bytes("MjAyNsfQs+K1tSC8vMDUv7m76rjtvLy8rQ0KMjAyNsfQs+K1tSC8vMPiv7m76rjtvLy8rQ==");
    const result = decodeBudgetCsv(bytes);
    expect(result.encoding).toBe("euc-kr");
    expect(result.text).toContain("세출예산명세서");
    expect(result.text).not.toContain("�");
  });
});
