import type { BudgetDataset, SchoolManifestEntry } from "./types";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const MANIFEST_URL = "/data/school-analysis/manifest.json";
const DATASET_ERROR_MESSAGE = "선택한 학교의 결산자료를 불러오지 못했습니다.";
const MANIFEST_ERROR_MESSAGE = "학교 목록을 불러오지 못했습니다.";

const manifestCache = new Map<string, Promise<SchoolManifestEntry[]>>();
const datasetCache = new Map<string, Promise<BudgetDataset>>();

function assertOk(response: Response, message: string): Response {
  if (!response.ok) {
    throw new Error(message);
  }
  return response;
}

function cachePromise<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  let request: Promise<T>;
  request = loader().catch((error: unknown) => {
    if (cache.get(key) === request) {
      cache.delete(key);
    }
    throw error;
  });
  cache.set(key, request);
  return request;
}

export function loadSchoolManifest(fetcher: Fetcher = fetch): Promise<SchoolManifestEntry[]> {
  return cachePromise(manifestCache, "manifest", () =>
    fetcher(MANIFEST_URL)
      .then((response) => assertOk(response, MANIFEST_ERROR_MESSAGE))
      .then((response) => response.json() as Promise<SchoolManifestEntry[]>),
  );
}

export function loadSchoolDataset(
  entry: SchoolManifestEntry,
  fetcher: Fetcher = fetch,
): Promise<BudgetDataset> {
  const key = `${entry.schoolCode}:${entry.fiscalYear}:${entry.referenceMonth}`;
  const url = `/data/school-analysis/schools/${encodeURIComponent(entry.file)}`;

  return cachePromise(datasetCache, key, () =>
    fetcher(url)
      .then((response) => assertOk(response, DATASET_ERROR_MESSAGE))
      .then((response) => response.json() as Promise<BudgetDataset>),
  );
}

export function clearSchoolAnalysisCache(): void {
  manifestCache.clear();
  datasetCache.clear();
}
