import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function parseJson(contents, filePath) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`유효한 JSON 파일이 아닙니다: ${filePath}`, { cause: error });
  }
}

function assertManifestEntry(entry, index) {
  if (
    !entry ||
    typeof entry.schoolName !== "string" ||
    !entry.schoolName ||
    typeof entry.schoolCode !== "string" ||
    !entry.schoolCode ||
    !Number.isInteger(entry.fiscalYear) ||
    typeof entry.referenceMonth !== "string" ||
    !/^\d{6}$/.test(entry.referenceMonth) ||
    typeof entry.file !== "string" ||
    !entry.file ||
    path.basename(entry.file) !== entry.file
  ) {
    throw new Error(`학교 목록 ${index + 1}번째 항목이 올바르지 않습니다.`);
  }
}

function assertSummaryIdentity(summary, entry) {
  if (
    !summary ||
    summary.schoolName !== entry.schoolName ||
    summary.schoolCode !== entry.schoolCode ||
    summary.fiscalYear !== entry.fiscalYear ||
    summary.referenceMonth !== entry.referenceMonth
  ) {
    throw new Error(`학교 결산자료 식별자가 목록과 일치하지 않습니다: ${entry.file}`);
  }
}

export async function importSchoolAnalysisData(sourceRoot, outputRoot) {
  const source = path.join(sourceRoot, "school-budget", "data");
  const manifestPath = path.join(source, "fixtures", "manifest.json");
  const manifest = parseJson(await readFile(manifestPath, "utf8"), manifestPath);

  if (!Array.isArray(manifest)) {
    throw new Error("학교 목록은 배열이어야 합니다.");
  }
  if (manifest.length !== 1653 && process.env.NODE_ENV !== "test") {
    throw new Error(`학교 자료는 1,653건이어야 합니다: ${manifest.length}`);
  }

  const keys = new Set();
  for (const [index, entry] of manifest.entries()) {
    assertManifestEntry(entry, index);
    const key = `${entry.schoolCode}:${entry.fiscalYear}:${entry.referenceMonth}`;
    if (keys.has(key)) {
      throw new Error(`중복된 학교 자료 식별자입니다: ${key}`);
    }
    keys.add(key);
  }

  const profilesPath = path.join(source, "school-profiles", "school-profiles_2025.json");
  const profileDocument = parseJson(await readFile(profilesPath, "utf8"), profilesPath);
  if (!Array.isArray(profileDocument.profiles)) {
    throw new Error("학교 기본정보 목록은 배열이어야 합니다.");
  }

  const profilesBySchoolCode = new Map();
  for (const profile of profileDocument.profiles) {
    if (!profile || typeof profile.schoolCode !== "string" || !profile.schoolCode) {
      throw new Error("학교 기본정보에 학교 코드가 없습니다.");
    }
    if (profilesBySchoolCode.has(profile.schoolCode)) {
      throw new Error(`중복된 학교 기본정보 코드입니다: ${profile.schoolCode}`);
    }
    profilesBySchoolCode.set(profile.schoolCode, profile);
  }

  const schoolsRoot = path.join(outputRoot, "schools");
  await mkdir(schoolsRoot, { recursive: true });

  const compactManifest = [];
  for (const entry of manifest) {
    const sourceFilePath = path.join(source, "fixtures", "schools", entry.file);
    const dataset = parseJson(await readFile(sourceFilePath, "utf8"), sourceFilePath);
    assertSummaryIdentity(dataset.summary, entry);

    const schoolProfile = profilesBySchoolCode.get(entry.schoolCode) ?? null;
    await writeFile(
      path.join(schoolsRoot, entry.file),
      JSON.stringify({ ...dataset, schoolProfile }),
    );
    compactManifest.push({
      schoolName: entry.schoolName,
      schoolCode: entry.schoolCode,
      fiscalYear: entry.fiscalYear,
      referenceMonth: entry.referenceMonth,
      file: entry.file,
    });
  }

  compactManifest.sort((left, right) =>
    left.schoolName.localeCompare(right.schoolName, "ko-KR") || left.schoolCode.localeCompare(right.schoolCode),
  );
  await writeFile(path.join(outputRoot, "manifest.json"), JSON.stringify(compactManifest));

  return compactManifest;
}

async function runCli() {
  const sourceRoot = process.argv[2];
  if (!sourceRoot) {
    throw new Error("사용법: npm run import:school-analysis -- <sen-budget-root>");
  }
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const outputRoot = path.resolve(scriptDirectory, "..", "public", "data", "school-analysis");
  const manifest = await importSchoolAnalysisData(sourceRoot, outputRoot);
  console.log(`학교별 결산자료 ${manifest.length}건을 가져왔습니다.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
