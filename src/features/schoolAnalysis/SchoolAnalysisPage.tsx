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
import {
  invalidateSchoolDataset,
  loadSchoolDataset,
  loadSchoolManifest,
} from "./data";
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
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && /[가-힣]/u.test(error.message)
    ? error.message
    : fallback;

function AnalysisLoading({ label, message }: { label: string; message: string }) {
  return (
    <section
      className="school-analysis-loading"
      role="region"
      aria-label={label}
      aria-busy="true"
    >
      <p role="status">{message}</p>
      <div className="school-analysis-loading-kpis">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} role="presentation" className="school-analysis-skeleton-card" />
        ))}
      </div>
      <div className="school-analysis-loading-panels">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} role="presentation" className="school-analysis-skeleton-card" />
        ))}
      </div>
    </section>
  );
}

export default function SchoolAnalysisPage() {
  const [state, setState] = useState<PageState>({ status: "loading-manifest" });
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
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
          message: errorMessage(error, "학교 목록을 불러오지 못했습니다."),
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
  const visibleMatches = matches.slice(0, 50);
  const activeSchool = expanded ? visibleMatches[activeIndex] : undefined;
  useEffect(() => {
    if (activeSchool) {
      list.current
        ?.querySelector<HTMLElement>(
          `#school-option-${activeSchool.schoolCode}`,
        )
        ?.scrollIntoView?.({ block: "nearest" });
    }
  }, [activeSchool]);
  const selectSchool = async (entry: SchoolManifestEntry) => {
    setExpanded(false);
    setActiveIndex(-1);
    setQuery(entry.schoolName);
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
          message: errorMessage(
            error,
            "선택한 학교의 결산자료를 불러오지 못했습니다.",
          ),
        });
    }
  };
  const retry = () => {
    if (selected) {
      invalidateSchoolDataset(selected);
      void selectSchool(selected);
    } else void loadManifest();
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
        <AnalysisLoading
          label="학교 목록 불러오는 중"
          message="학교 목록을 불러오는 중입니다."
        />
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
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={expanded}
              aria-activedescendant={
                activeSchool
                  ? `school-option-${activeSchool.schoolCode}`
                  : undefined
              }
              value={query}
              placeholder="학교명 또는 학교코드 입력"
              aria-controls="school-analysis-results"
              onFocus={() => setExpanded(true)}
              onBlur={() => {
                setExpanded(false);
                setActiveIndex(-1);
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setExpanded(true);
                setActiveIndex(-1);
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Escape") {
                  event.preventDefault();
                  setExpanded(false);
                  setActiveIndex(-1);
                } else if (event.key === "Enter" && activeSchool) {
                  event.preventDefault();
                  void selectSchool(activeSchool);
                } else if (
                  event.key === "ArrowDown" ||
                  event.key === "ArrowUp"
                ) {
                  event.preventDefault();
                  setExpanded(true);
                  if (visibleMatches.length)
                    setActiveIndex((index) =>
                      event.key === "ArrowDown"
                        ? (index + 1) % visibleMatches.length
                        : index < 0
                          ? visibleMatches.length - 1
                          : (index - 1 + visibleMatches.length) %
                            visibleMatches.length,
                    );
                } else if (
                  expanded &&
                  activeIndex >= 0 &&
                  (event.key === "Home" || event.key === "End")
                ) {
                  event.preventDefault();
                  setActiveIndex(
                    event.key === "Home" ? 0 : visibleMatches.length - 1,
                  );
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
            hidden={!expanded}
          >
            {visibleMatches.map((entry, index) => (
              <button
                key={entry.schoolCode}
                id={`school-option-${entry.schoolCode}`}
                role="option"
                tabIndex={-1}
                data-active={activeIndex === index}
                aria-label={entry.schoolName}
                aria-selected={
                  activeIndex === index ||
                  (activeIndex < 0 && selected?.schoolCode === entry.schoolCode)
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectSchool(entry)}
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
        <AnalysisLoading
          label="결산자료 불러오는 중"
          message={`${state.selected.schoolName} 결산자료를 불러오는 중입니다.`}
        />
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
