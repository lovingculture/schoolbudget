const INCOME_LEVELS = ["장소계", "관소계", "항소계", "목상세"];
const EXPENSE_LEVELS = [
  "정책사업소계",
  "단위사업소계",
  "세부사업소계",
  "세부항목상세",
];
const PERIOD_FIELDS = ["schoolCode", "schoolName", "fiscalYear", "referenceMonth"];
const SUMMARY_AMOUNTS = [
  "budgetAmount",
  "currentBudget",
  "incomeSettlement",
  "expenseSettlement",
  "surplus",
];
const ROW_AMOUNTS = [
  "budgetAmount",
  "currentBudget",
  "settlementAmount",
  "difference",
];
const validatedHttpsUrls = new Set();

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 객체가 올바르지 않습니다.`);
  }
  return value;
}

function string(value, label, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new Error(`${label} 문자열 필드가 올바르지 않습니다.`);
  }
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} 양의 정수 식별자가 올바르지 않습니다.`);
  }
}

function amount(value, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${label} 금액은 안전한 정수여야 합니다.`);
  }
}

function httpsUrl(value, label) {
  string(value, label);
  if (validatedHttpsUrls.has(value)) return;
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`${label} 원문 URL이 올바르지 않습니다.`, { cause: error });
  }
  if (url.protocol !== "https:") {
    throw new Error(`${label} 원문 URL은 HTTPS여야 합니다.`);
  }
  validatedHttpsUrls.add(value);
}

function validateManifestEntry(value, index) {
  const entry = object(value, `학교 목록 ${index + 1}번째 항목`);
  string(entry.schoolName, `학교 목록 ${index + 1}번째 학교명`);
  if (typeof entry.schoolCode !== "string" || !/^B\d{9}$/.test(entry.schoolCode)) {
    throw new Error(`학교 목록 ${index + 1}번째 학교 코드가 올바르지 않습니다.`);
  }
  if (entry.fiscalYear !== 2025) {
    throw new Error(`학교 결산 기준연도는 2025년이어야 합니다: ${entry.schoolCode}`);
  }
  if (typeof entry.referenceMonth !== "string" || !/^\d{6}$/.test(entry.referenceMonth)) {
    throw new Error(`학교 목록 ${index + 1}번째 기준년월이 올바르지 않습니다.`);
  }
  if (
    typeof entry.file !== "string" ||
    !entry.file ||
    !/^[^/\\]+\.json$/.test(entry.file) ||
    entry.file === ".json" ||
    entry.file === "..json"
  ) {
    throw new Error(`학교 목록 ${index + 1}번째 파일명이 올바르지 않습니다.`);
  }
  return entry;
}

export function validateSchoolManifest(value) {
  if (!Array.isArray(value)) {
    throw new Error("학교 목록은 배열이어야 합니다.");
  }
  const identities = new Set();
  const files = new Set();
  for (const [index, rawEntry] of value.entries()) {
    const entry = validateManifestEntry(rawEntry, index);
    const identity = `${entry.schoolCode}:${entry.fiscalYear}:${entry.referenceMonth}`;
    if (identities.has(identity)) {
      throw new Error(`중복된 학교 자료 식별자입니다: ${identity}`);
    }
    if (files.has(entry.file)) {
      throw new Error(`중복된 학교 자료 파일명입니다: ${entry.file}`);
    }
    identities.add(identity);
    files.add(entry.file);
  }
  return value;
}

function validatePeriod(row, summary, label) {
  for (const field of PERIOD_FIELDS) {
    if (row[field] !== summary[field]) {
      throw new Error(`${label}의 학교·기간이 요약과 일치하지 않습니다.`);
    }
  }
}

function validateHierarchy(row, rowType, levels, fields, label) {
  const allowed = [...levels, "합계"];
  if (!allowed.includes(rowType)) {
    throw new Error(`${label}의 원문 행 구분이 올바르지 않습니다.`);
  }
  const requiredDepth = rowType === "합계" ? fields.length : levels.indexOf(rowType) + 1;
  for (const [index, field] of fields.entries()) {
    if (typeof row[field] !== "string") {
      throw new Error(`${label}의 계층 필드 ${field}가 올바르지 않습니다.`);
    }
    const populated = Boolean(row[field].trim());
    if ((index < requiredDepth && !populated) || (index >= requiredDepth && populated)) {
      throw new Error(`${label}의 계층 필드 ${field}가 행 구분과 일치하지 않습니다.`);
    }
  }
}

function validateRows(value, summary, config) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${config.label} 결산 행이 없습니다.`);
  }
  const identities = new Set();
  const totalCounts = new Map();
  const bundles = new Set();
  for (const [index, rawRow] of value.entries()) {
    const label = `${config.label} ${index + 1}번째 행`;
    const row = object(rawRow, label);
    validatePeriod(row, summary, label);
    positiveInteger(row.sourceBundleNumber, `${label} 원문 묶음 번호`);
    positiveInteger(row.duplicateBundleCount, `${label} 중복 묶음 수`);
    positiveInteger(row.sourceRowNumber, `${label} 원문 행 번호`);
    validateHierarchy(row, row.rowType, config.levels, config.fields, label);
    for (const field of ROW_AMOUNTS) amount(row[field], `${label} ${field}`);
    httpsUrl(row.sourceUrl, label);

    const identity = `${row.sourceBundleNumber}:${row.sourceRowNumber}`;
    if (identities.has(identity)) {
      throw new Error(`${config.label} 중복 원문 행입니다: ${identity}`);
    }
    identities.add(identity);
    bundles.add(row.sourceBundleNumber);
    if (row.rowType === "합계") {
      totalCounts.set(
        row.sourceBundleNumber,
        (totalCounts.get(row.sourceBundleNumber) ?? 0) + 1,
      );
    }
  }
  for (const bundle of bundles) {
    if (totalCounts.get(bundle) !== 1) {
      throw new Error(`${config.label} 원문 묶음 ${bundle}의 합계 행은 정확히 1개여야 합니다.`);
    }
  }
}

function validateLinkedProfile(value, summary) {
  if (value === undefined || value === null) return;
  const profile = object(value, "학교 기본정보");
  if (
    profile.schoolCode !== summary.schoolCode ||
    profile.schoolName !== summary.schoolName ||
    profile.referenceYear !== summary.fiscalYear
  ) {
    throw new Error("학교 기본정보 식별자가 결산자료와 일치하지 않습니다.");
  }
  if (
    typeof profile.disclosureSchoolCode !== "string" ||
    !/^S\d{9}$/.test(profile.disclosureSchoolCode) ||
    profile.disclosureSchoolCode.slice(-7) !== summary.schoolCode.slice(-7) ||
    profile.linkageBasis !== "same-year+unique-code-suffix+exact-name"
  ) {
    throw new Error("학교 기본정보 연결 근거가 결산자료와 일치하지 않습니다.");
  }
  for (const field of ["studentCount", "siteAreaM2", "buildingGrossAreaM2"]) {
    const numericValue = profile[field];
    if (
      numericValue !== null &&
      (typeof numericValue !== "number" || !Number.isFinite(numericValue) || numericValue < 0)
    ) {
      throw new Error(`학교 기본정보 수치 ${field}가 올바르지 않습니다.`);
    }
  }
  if (profile.studentCount !== null && !Number.isSafeInteger(profile.studentCount)) {
    throw new Error("학교 기본정보 학생 수는 안전한 정수여야 합니다.");
  }
  if ("rawSiteAreaM2" in profile) {
    const rawSiteArea = profile.rawSiteAreaM2;
    if (
      rawSiteArea !== null &&
      (typeof rawSiteArea !== "number" || !Number.isFinite(rawSiteArea) || rawSiteArea < 0)
    ) {
      throw new Error("학교 기본정보 수치 rawSiteAreaM2가 올바르지 않습니다.");
    }
  }
}

export function validateBudgetDataset(value, expectedEntry) {
  const dataset = object(value, "학교 결산자료");
  const summary = object(dataset.summary, "학교 결산자료 요약");
  string(summary.schoolName, "학교 결산자료 학교명");
  if (typeof summary.schoolCode !== "string" || !/^B\d{9}$/.test(summary.schoolCode)) {
    throw new Error("학교 결산자료 학교 코드가 올바르지 않습니다.");
  }
  positiveInteger(summary.fiscalYear, "학교 결산자료 회계연도");
  if (summary.fiscalYear !== 2025) {
    throw new Error("학교 결산자료 회계연도는 2025년이어야 합니다.");
  }
  if (typeof summary.referenceMonth !== "string" || !/^\d{6}$/.test(summary.referenceMonth)) {
    throw new Error("학교 결산자료 기준년월이 올바르지 않습니다.");
  }
  string(summary.note, "학교 결산자료 비고", true);
  string(summary.collectionStatus, "학교 결산자료 수집 상태");
  httpsUrl(summary.sourceUrl, "학교 결산자료 요약");
  for (const field of SUMMARY_AMOUNTS) {
    amount(summary[field], `학교 결산자료 요약 ${field}`, true);
  }
  if (expectedEntry) {
    for (const field of PERIOD_FIELDS) {
      if (summary[field] !== expectedEntry[field]) {
        throw new Error("선택한 학교·기간과 자료가 일치하지 않습니다.");
      }
    }
  }
  string(dataset.collectedAt, "학교 결산자료 수집 시각");
  if (!Array.isArray(dataset.findings) || dataset.findings.some((item) => typeof item !== "string")) {
    throw new Error("학교 결산자료 대조 메시지가 올바르지 않습니다.");
  }
  validateRows(dataset.incomeRows, summary, {
    label: "세입",
    levels: INCOME_LEVELS,
    fields: ["chapter", "section", "subsection", "item"],
  });
  validateRows(dataset.expenseRows, summary, {
    label: "세출",
    levels: EXPENSE_LEVELS,
    fields: ["policyProgram", "unitProgram", "detailProgram", "lineItem"],
  });
  validateLinkedProfile(dataset.schoolProfile, summary);
  return value;
}
