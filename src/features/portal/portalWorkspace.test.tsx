import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve("src/features/portal/portalWorkspace.css"), "utf8");

describe("portal workspace visual contract", () => {
  it("scopes the home palette and controls to portal workspaces", () => {
    expect(css).toContain(".portal-workspace");
    expect(css).toContain("#14334e");
    expect(css).toContain("#188bc1");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain(":focus-visible");
  });

  it("keeps generated A4 document surfaces out of shared overrides", () => {
    expect(css).toContain(".prebudget-paper");
    expect(css).toContain(".closing-a4-page");
    expect(css).toContain(".budget-agenda-a4-page");
  });
});
