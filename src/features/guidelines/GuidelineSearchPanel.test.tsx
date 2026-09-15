// @vitest-environment node
import { describe, expect, it } from "vitest";
import { build, type Rollup } from "vite";

describe("예산 자료실의 지침 검색 디자인", () => {
  it("배포 CSS에 검색 영역과 지침 카드 레이아웃을 포함한다", async () => {
    const result = await build({
      logLevel: "silent",
      build: { write: false },
    }) as Rollup.RollupOutput;
    const css = result.output
      .filter((item): item is Rollup.OutputAsset => item.type === "asset" && item.fileName.endsWith(".css"))
      .map((asset) => String(asset.source))
      .join("\n");

    expect(css).toMatch(/\.guideline-search\{display:flex/);
    expect(css).toMatch(/\.guideline-document-card\{display:flex/);
  }, 120_000);
});
