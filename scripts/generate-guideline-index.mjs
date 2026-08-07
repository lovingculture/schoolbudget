import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const pdf = "public/guidelines/2026-school-budget-guideline.pdf";
const output = "src/features/guidelines/guidelineIndex.json";
const pageCount = 216;

mkdirSync("src/features/guidelines", { recursive: true });

const pages = Array.from({ length: pageCount }, (_, index) => {
  const page = index + 1;
  const raw = execFileSync(
    "pdftotext",
    ["-f", String(page), "-l", String(page), "-layout", pdf, "-"],
    { encoding: "utf8" },
  );

  return { page, text: raw.replace(/\s+/g, " ").trim() };
});

writeFileSync(output, `${JSON.stringify(pages, null, 2)}\n`);
