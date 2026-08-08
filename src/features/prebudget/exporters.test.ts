import { beforeEach, describe, expect, it, vi } from "vitest";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { exportPrebudgetPdf } from "./exporters";

vi.mock("html2canvas", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn() }));

describe("성립전예산 PDF 내보내기", () => {
  const addImage = vi.fn();
  const addPage = vi.fn();
  const output = vi.fn(() => new Blob());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jsPDF).mockImplementation(() => ({ addImage, addPage, output }) as unknown as jsPDF);
  });

  it("tall preview canvas exports every vertical A4 page", async () => {
    const canvas = document.createElement("canvas");
    Object.defineProperties(canvas, { width: { value: 1000 }, height: { value: 3000 } });
    vi.spyOn(canvas, "toDataURL").mockReturnValue("data:image/jpeg;base64,tall");
    vi.mocked(html2canvas).mockResolvedValue(canvas);

    await exportPrebudgetPdf(document.createElement("article"), "성립전예산");

    expect(addPage).toHaveBeenCalledTimes(2);
    expect(addImage).toHaveBeenCalledTimes(3);
    expect(addImage.mock.calls.map(([, , , y]) => y)).toEqual([10, -267, -544]);
  });

  it("one-page preview still exports as one PDF page", async () => {
    const canvas = document.createElement("canvas");
    Object.defineProperties(canvas, { width: { value: 1000 }, height: { value: 1000 } });
    vi.spyOn(canvas, "toDataURL").mockReturnValue("data:image/jpeg;base64:short");
    vi.mocked(html2canvas).mockResolvedValue(canvas);

    await exportPrebudgetPdf(document.createElement("article"), "성립전예산");

    expect(addPage).not.toHaveBeenCalled();
    expect(addImage).toHaveBeenCalledTimes(1);
  });
});
