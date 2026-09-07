import { mkdir, readdir, rm, writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
const retainedBuildDirectories = new Set(["client", "server", ".openai"]);
for (const entry of await readdir("dist", { withFileTypes: true })) {
  if (!retainedBuildDirectories.has(entry.name)) {
    await rm(`dist/${entry.name}`, { recursive: true, force: true });
  }
}

await mkdir("dist/server", { recursive: true });
await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const workbookDownloads = {
      "/download/expenditure-performance-budget-revision.xlsm": {
        asset: "/resources/expenditure-performance-budget-revision.xlsm",
        filename: "★집행실적정리용엑셀_버튼캐릭터추가.xlsm",
      },
      "/download/school-main-budget-foundation-template.xlsm": {
        asset: "/resources/school-main-budget-foundation-template.xlsm",
        filename: "★학교 본예산편성 기초자료_올해세입작성용.xlsm",
      },
    };
    const workbookDownload = workbookDownloads[url.pathname];
    const isWorkbookDownload = Boolean(workbookDownload);
    const assetRequest = workbookDownload
      ? new Request(new URL(workbookDownload.asset, request.url), request)
      : request;
    const response = await env.ASSETS.fetch(assetRequest);
    if (response.status !== 404) {
      if (isWorkbookDownload) {
        const headers = new Headers(response.headers);
        headers.set("Content-Type", "application/vnd.ms-excel.sheet.macroEnabled.12");
        headers.set(
          "Content-Disposition",
          "attachment; filename=school-budget-workbook.xlsm; filename*=UTF-8''" +
            encodeURIComponent(workbookDownload.filename),
        );
        headers.set("X-Content-Type-Options", "nosniff");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
      return response;
    }
    return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  },
};
`,
  "utf8",
);
