import type { BudgetResourceInput } from "./resourceTypes";

export const MAX_RESOURCE_BYTES = 30 * 1024 * 1024;
export const ALLOWED_RESOURCE_EXTENSIONS = ["pdf", "xls", "xlsx", "docx", "hwp", "hwpx"] as const;

type ResourceValidationInput = BudgetResourceInput & { file?: File | null };

const MIME_TYPES_BY_EXTENSION: Record<typeof ALLOWED_RESOURCE_EXTENSIONS[number], readonly string[]> = {
  pdf: ["application/pdf"],
  xls: ["application/vnd.ms-excel", "application/excel", "application/xls", "application/x-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  hwp: ["application/x-hwp", "application/vnd.hancom.hwp", "application/haansofthwp"],
  hwpx: ["application/vnd.hancom.hwpx", "application/x-hwpx"],
};

function extensionOf(filename: string) {
  return filename.trim().split(".").at(-1)?.toLowerCase() ?? "";
}

function isAllowedFile(file: File) {
  const extension = extensionOf(file.name);
  if (!ALLOWED_RESOURCE_EXTENSIONS.includes(extension as typeof ALLOWED_RESOURCE_EXTENSIONS[number])) return false;
  const allowedExtension = extension as typeof ALLOWED_RESOURCE_EXTENSIONS[number];
  return (allowedExtension === "hwp" || allowedExtension === "hwpx") && !file.type
    || MIME_TYPES_BY_EXTENSION[allowedExtension].includes(file.type.toLowerCase());
}

export function validateResourceInput(input: ResourceValidationInput): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("자료 제목을 입력하세요.");
  if (input.file && input.file.size > MAX_RESOURCE_BYTES) errors.push("파일은 30MB 이하만 등록할 수 있습니다.");
  if (input.file && !isAllowedFile(input.file)) {
    errors.push("PDF, XLS, XLSX, DOCX, HWP, HWPX 파일만 등록할 수 있습니다.");
  }
  return errors;
}
