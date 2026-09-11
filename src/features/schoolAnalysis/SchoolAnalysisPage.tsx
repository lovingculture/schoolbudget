import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BarChart3, Search } from "lucide-react";
import { loadSchoolDataset, loadSchoolManifest } from "./data";
import SchoolAnalysisDashboard from "./SchoolAnalysisDashboard";
import type { BudgetDataset, SchoolManifestEntry } from "./types";
import "./schoolAnalysis.css";

type PageState =
  | { status: "loading-manifest" }
  | { status: "selecting"; schools: SchoolManifestEntry[] }
  | {
      status: "loading-school";
      schools: SchoolManifestEntry[];
      selected: SchoolManifestEntry;
    }
  | {
      status: "ready";
      schools: SchoolManifestEntry[];
      selected: SchoolManifestEntry;
      dataset: BudgetDataset;
    }
  | {
      status: "error";
      schools: SchoolManifestEntry[];
      selected?: SchoolManifestEntry;
      message: string;
    };

export class AnalysisErrorBoundary extends Component<
  {
    children: ReactNode;
    onRetry: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="school-analysis-notice">
        <p>
          분석자료를 표시하지 못했습니다. 다른 학교를 선택하거나 다시 시도해
          주세요.
        </p>
        <button onClick={this.props.onRetry}>다시 시도</button>
      </div>
    ) : (
      this.props.children
    );
  }
}

const normalize = (value: string) =>
  value.normalize("NFC").trim().toLocaleLowerCase("ko-KR");
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "자료를 불러오지 못했습니다.";

export default function SchoolAnalysisPage() {
  const [state, setState] = useState<PageState>({ status: "loading-manifest" });
  const [query, setQuery] = useState("");
  const request = useRef(0);
  const list = useRef<HTMLDivElement>(null);
  const loadManifest = useCallback(async () => {
    const id = ++request.current;
    setState({ status: "loading-manifest" });
    try {
      const schools = await loadSchoolManifest();
      if (id === request.current) setState({ status: "selecting", schools });
    } catch (error) {
      if (id === request.current)
        setState({
          status: "error",
          schools: [],
          message: errorMessage(error),
        });
    }
  }, []);
  useEffect(() => {
    void loadManifest();
    return () => {
      request.current += 1;
    };
  }, [loadManifest]);
  const schools = "schools" in state ? state.schools : [];
  const selected = "selected" in state ? state.selected : undefined;
  const uniqueSchools = useMemo(
    () => [
      ...new Map(schools.map((school) => [school.schoolCode, school])).values(),
    ],
    [schools],
  );
  const matches = useMemo(() => {
    const text = normalize(query);
    const exact = uniqueSchools.filter(
      (school) => normalize(school.schoolCode) === text,
    );
    const names = uniqueSchools.filter((school) =>
      normalize(school.schoolName).includes(text),
    );
    return [
      ...new Map(
        [...exact, ...names].map((school) => [school.schoolCode, school]),
      ).values(),
    ];
  }, [query, uniqueSchools]);
  const selectSchool = async (entry: SchoolManifestEntry) => {
    const id = ++request.current;
    setState({ status: "loading-school", schools, selected: entry });
    try {
      const dataset = await loadSchoolDataset(entry);
      const scopes = [
        dataset.summary,
        ...dataset.incomeRows,
        ...dataset.expenseRows,
      ];
      if (
        scopes.some(
          (row) =>
            row.schoolCode !== entry.schoolCode ||
            row.schoolName !== entry.schoolName ||
            row.fiscalYear !== entry.fiscalYear ||
            row.referenceMonth !== entry.referenceMonth,
        )
      ) {
        throw new Error("선택한 학교·기간과 자료가 일치하지 않습니다.");
      }
      if (id === request.current)
        setState({ status: "ready", schools, selected: entry, dataset });
    } catch (error) {
      if (id === request.current)
        setState({
          status: "error",
          schools,
          selected: entry,
          message: errorMessage(error),
        });
    }
  };
  const retry = () => {
    if (selected) void selectSchool(selected);
    else void loadManifest();
  };

  return (
    <section className="school-analysis-page" aria-label="학교별 예산 분석">
      <header className="school-analysis-heading">
        <span className="school-analysis-eyebrow">
          <BarChart3 size={18} aria-hidden="true" /> 학교회계 결산
        </span>
        <h1>학교별 예산 분석</h1>
        <p>학교를 찾아 세입·세출 결산과 예산 사용 내역을 살펴보세요.</p>
      </header>
      {state.status === "loading-manifest" ? (
        <p role="status">학교 목록을 불러오는 중입니다.</p>
      ) : (
        <section
          className="school-analysis-panel school-analysis-selector"
          aria-label="학교 선택"
        >
          <div className="school-analysis-heading-row">
            <label htmlFor="school-analysis-search">학교 검색</label>
            <span>
              {uniqueSchools.length.toLocaleString("ko-KR")}개 학교·유치원
            </span>
          </div>
          <div className="school-analysis-search">
            <Search size={20} aria-hidden="true" />
            <input
              id="school-analysis-search"
              type="search"
              value={query}
              placeholder="학교명 또는 학교코드 입력"
              aria-controls="school-analysis-results"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  list.current
                    ?.querySelector<HTMLButtonElement>("button")
                    ?.focus();
                }
              }}
            />
          </div>
          <p className="school-analysis-muted" aria-live="polite">
            {matches.length > 50
              ? `${matches.length.toLocaleString("ko-KR")}개 검색됨 · 처음 50개 표시. 학교명을 더 입력해 주세요.`
              : `${matches.length}개 검색됨`}
          </p>
          <div
            id="school-analysis-results"
            ref={list}
            role="listbox"
            aria-label="학교 검색 결과"
            className="school-analysis-results"
          >
            {matches.slice(0, 50).map((entry, index) => (
              <button
                key={entry.schoolCode}
                role="option"
                aria-label={entry.schoolName}
                aria-selected={selected?.schoolCode === entry.schoolCode}
                onClick={() => void selectSchool(entry)}
                onKeyDown={(event) => {
                  const buttons =
                    list.current?.querySelectorAll<HTMLButtonElement>("button");
                  if (!buttons?.length) return;
                  const target =
                    event.key === "ArrowDown"
                      ? (index + 1) % buttons.length
                      : event.key === "ArrowUp"
                        ? (index - 1 + buttons.length) % buttons.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? buttons.length - 1
                            : null;
                  if (target !== null) {
                    event.preventDefault();
                    buttons[target].focus();
                  }
                }}
              >
                <strong>{entry.schoolName}</strong>
                <span>
                  {entry.schoolCode} · {entry.fiscalYear}회계연도
                </span>
              </button>
            ))}
          </div>
          {matches.length === 0 && <p>검색 결과가 없습니다.</p>}
        </section>
      )}
      {state.status === "selecting" && (
        <p className="school-analysis-empty">
          학교를 선택하면 해당 학교의 결산자료를 불러옵니다.
        </p>
      )}
      {state.status === "loading-school" && (
        <p role="status" className="school-analysis-empty">
          {state.selected.schoolName} 결산자료를 불러오는 중입니다.
        </p>
      )}
      {state.status === "error" && (
        <div role="alert" className="school-analysis-notice">
          <p>{state.message}</p>
          <button onClick={retry}>다시 시도</button>
        </div>
      )}
      {state.status === "ready" && (
        <AnalysisErrorBoundary
          key={`${state.selected.schoolCode}:${state.selected.fiscalYear}:${state.selected.referenceMonth}`}
          onRetry={retry}
        >
          <SchoolAnalysisDashboard dataset={state.dataset} />
        </AnalysisErrorBoundary>
      )}
    </section>
  );
}
