export const RESOURCE_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/haansofthwp",
  "application/hwp+zip",
  "application/octet-stream",
] as const;

type ResourceUploadMimeType = (typeof RESOURCE_UPLOAD_MIME_TYPES)[number];

const MIME_TYPE_BY_EXTENSION = {
  pdf: "application/pdf",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  hwp: "application/haansofthwp",
  hwpx: "application/hwp+zip",
} as const satisfies Record<string, ResourceUploadMimeType>;

export function canonicalMimeForFilename(filename: string): ResourceUploadMimeType {
  const extension = filename.trim().split(".").at(-1)?.toLowerCase() ?? "";
  return MIME_TYPE_BY_EXTENSION[extension as keyof typeof MIME_TYPE_BY_EXTENSION]
    ?? "application/octet-stream";
}
