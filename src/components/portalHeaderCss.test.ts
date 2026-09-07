import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const portalCss = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

describe("예산 업무 드롭다운", () => {
  it("데스크톱에서 긴 업무 이름을 한 줄로 보여준다", () => {
    expect(portalCss).toContain(".portal-work-dropdown{position:absolute;top:calc(100% + 9px);left:0;z-index:35;display:grid;width:max-content;min-width:390px;max-width:calc(100vw - 24px);");
    expect(portalCss).toContain(".portal-work-dropdown button{border:0;border-radius:8px;background:transparent;color:#435450;padding:10px 12px;text-align:left;font-size:13px;white-space:nowrap;");
    expect(portalCss).toContain(".portal-work-dropdown button{padding-left:22px;white-space:normal}");
  });
});
