import { describe, expect, it } from "vitest";
import { parseCsvRecords } from "./parseCsvRecords";

describe("parseCsvRecords", () => {
  it("keeps commas and line breaks inside quoted cells", () => {
    expect(parseCsvRecords('항목,산출기초\r\n이자수입,"예금, 이자\n1회"')).toEqual([
      ["항목", "산출기초"],
      ["이자수입", "예금, 이자\n1회"],
    ]);
  });

  it("unescapes doubled quotes and keeps trailing empty cells", () => {
    expect(parseCsvRecords('항목,"""특별"" 수입",,')).toEqual([
      ["항목", '"특별" 수입', "", ""],
    ]);
  });
});
