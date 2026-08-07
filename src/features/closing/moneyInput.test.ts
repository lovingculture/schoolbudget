import { describe, expect, it } from "vitest";
import { formatEditableMoney, parseEditableMoney } from "./moneyInput";

describe("결산설명서 금액 입력 형식", () => {
  it("정수와 음수에 세 자리 쉼표를 표시한다", () => {
    expect(formatEditableMoney(2727447000)).toBe("2,727,447,000");
    expect(formatEditableMoney(-1234567)).toBe("-1,234,567");
    expect(formatEditableMoney(0)).toBe("0");
  });

  it("쉼표가 포함된 입력을 숫자로 변환한다", () => {
    expect(parseEditableMoney("1,713,791,920")).toBe(1713791920);
    expect(parseEditableMoney("-1,234,567")).toBe(-1234567);
    expect(parseEditableMoney("")).toBe(0);
  });
});
