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
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  },
};
`,
  "utf8",
);
