import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "prepare-sites-build.mjs");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test("removes stale root assets so the deployed site uses the current client build", async () => {
  const projectDirectory = await mkdtemp(join(tmpdir(), "school-budget-sites-build-"));
  temporaryDirectories.push(projectDirectory);

  await mkdir(join(projectDirectory, "dist", "assets"), { recursive: true });
  await mkdir(join(projectDirectory, "dist", "client"), { recursive: true });
  await writeFile(join(projectDirectory, "dist", "index.html"), "old build", "utf8");
  await writeFile(join(projectDirectory, "dist", "assets", "old.js"), "old bundle", "utf8");
  await writeFile(join(projectDirectory, "dist", "client", "index.html"), "current build", "utf8");

  execFileSync(process.execPath, [scriptPath], { cwd: projectDirectory });

  await expect(readFile(join(projectDirectory, "dist", "index.html"), "utf8")).rejects.toThrow();
  await expect(readFile(join(projectDirectory, "dist", "assets", "old.js"), "utf8")).rejects.toThrow();
  await expect(readFile(join(projectDirectory, "dist", "client", "index.html"), "utf8")).resolves.toBe("current build");
  await expect(readFile(join(projectDirectory, "dist", "server", "index.js"), "utf8")).resolves.toContain("env.ASSETS.fetch");
});
