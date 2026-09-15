import {
  Component,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  bundleNumbers,
  expenseAnalysisMetrics,
  getExpenseLevel,
  getIncomeLevel,
  getTopExpenseItems,
  getTotal,
  incomeStructureMetrics,
  money,
  percent,
  rigidExpenseBreakdown,
  rigidExpenseSummary,
  schoolScaleMetrics,
  sortNodes,
  summaryMetrics,
} from "./calculations";
import SchoolTreemap from "./SchoolTreemap";
import type { BudgetDataset, BudgetNode, MoneyUnit, SortKey } from "./types";

type Tab = "summary" | "income" | "expense";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "summary", label: "총괄" },
  { id: "income", label: "세입결산" },
  { id: "expense", label: "세출결산" },
];

function SourceLink({
  url,
  label = "원문 보기",
}: {
  url: string;
  label?: string;
}) {
  return /^https?:\/\//i.test(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {label} ↗
    </a>
  ) : (
    <span>출처 미제공</span>
  );
}

class DetailBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="school-analysis-notice">
        이 분석자료의 구조를 확인할 수 없습니다. 다른 탭이나 학교를 선택해
        주세요.
      </p>
    ) : (
      this.props.children
    );
  }
}

export default function SchoolAnalysisDashboard({
  dataset,
}: {
  dataset: BudgetDataset;
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const s = dataset.summary;
  const metrics = summaryMetrics(s);
  const kpis = [
    {
      label: "총 예산현액",
      value: money(s.currentBudget, "억원"),
      unit: "억원",
      exact: s.currentBudget,
    },
    {
      label: "세입결산액",
      value: money(s.incomeSettlement, "억원"),
      unit: "억원",
      exact: s.incomeSettlement,
    },
    {
      label: "세출결산액",
      value: money(s.expenseSettlement, "억원"),
      unit: "억원",
      exact: s.expenseSettlement,
    },
    {
      label: "세계잉여금",
      value: money(metrics.surplus, "만원"),
      unit: "만원",
      exact: metrics.surplus,
    },
    {
      label: "세입결산률",
      value: percent(metrics.incomeSettlementRate),
      unit: "",
      exact: null,
    },
    {
      label: "세출집행률",
      value: percent(metrics.expenseExecutionRate),
      unit: "",
      exact: null,
    },
  ];
  return (
    <div className="school-analysis-dashboard">
      <div className="school-analysis-heading-row school-analysis-school-title">
        <div>
          <span className="school-analysis-eyebrow">
            {s.fiscalYear}회계연도 · 기준월 {s.referenceMonth.slice(0, 4)}.
            {s.referenceMonth.slice(4)}
          </span>
          <h2>{s.schoolName}</h2>
          <p className="school-analysis-muted">
            학교코드 {s.schoolCode} · {s.collectionStatus}
          </p>
        </div>
        <SourceLink url={s.sourceUrl} />
      </div>
      <section className="school-analysis-kpis" aria-label="결산 핵심 지표">
        {kpis.map((card) => (
          <article key={card.label}>
            <h3>{card.label}</h3>
            <strong>
              {card.value} <small>{card.unit}</small>
            </strong>
            <p>
              {card.exact !== null
                ? `${money(card.exact)}원`
                : card.unit
                  ? "원문 미제공"
                  : "예산현액 대비"}
            </p>
          </article>
        ))}
      </section>
      <div
        role="tablist"
        aria-label="결산 분석"
        className="school-analysis-tabs"
      >
        {tabs.map(({ id, label }, index) => (
          <button
            key={id}
            ref={(element) => {
              tabButtons.current[index] = element;
            }}
            id={`school-analysis-tab-${id}`}
            role="tab"
            aria-selected={tab === id}
            aria-controls="school-analysis-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setTab(tabs[next].id);
                tabButtons.current[next]?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id="school-analysis-panel"
        role="tabpanel"
        aria-labelledby={`school-analysis-tab-${tab}`}
        tabIndex={0}
      >
        <DetailBoundary key={tab}>
          {tab === "summary" ? (
            <Summary dataset={dataset} onExplore={setTab} />
          ) : (
            <AnalysisView dataset={dataset} kind={tab} />
          )}
        </DetailBoundary>
      </div>
      <details className="school-analysis-panel school-analysis-notes">
        <summary>원문 대조 및 자료 안내 · {dataset.findings.length}건</summary>
        <p>
          원문 금액은 보존했습니다. 분석 차액은 예산현액 − 결산액으로
          계산합니다.
        </p>
        <p>자료 수집 시점: {dataset.collectedAt}</p>
        {dataset.findings.length > 0 && (
          <ul>
            {dataset.findings.map((finding, index) => (
              <li key={index}>{finding}</li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}

function Summary({
  dataset,
  onExplore,
}: {
  dataset: BudgetDataset;
  onExplore: (tab: Tab) => void;
}) {
  const { summary: s } = dataset;
  const metrics = summaryMetrics(s);
  const scale = schoolScaleMetrics(s, dataset.schoolProfile);
  const profile =
    dataset.schoolProfile?.schoolCode === s.schoolCode &&
    dataset.schoolProfile.schoolName === s.schoolName &&
    dataset.schoolProfile.referenceYear === s.fiscalYear
      ? dataset.schoolProfile
      : null;
  const scaleCards = [
    {
      label: "학생 1인당 세출결산액",
      value: scale.expensePerStudent,
      unit: "원",
      numerator: `${money(s.expenseSettlement)}원`,
      missing: "세출결산액이 없어 계산할 수 없습니다.",
    },
    {
      label: "학생 1인당 예산현액",
      value: scale.budgetPerStudent,
      unit: "원",
      numerator: `${money(s.currentBudget)}원`,
      missing: "예산현액이 없어 계산할 수 없습니다.",
    },
    {
      label: "학생 1인당 학교용지",
      value: scale.sitePerStudent,
      unit: "㎡",
      numerator: `${profile?.siteAreaM2?.toLocaleString("ko-KR")}㎡`,
      missing: profile?.siteAreaNote
        ? "공동사용 용지의 면적 확인이 필요합니다."
        : "학교용지 면적이 없어 계산할 수 없습니다.",
    },
  ];
  return (
    <>
      <section className="school-analysis-panel" aria-label="학교 기본정보">
        <div className="school-analysis-heading-row">
          <h3>{s.fiscalYear}년 학교 기본정보</h3>
          {profile && (
            <SourceLink url={profile.sourceUrl} label="학교알리미 출처" />
          )}
        </div>
        {profile ? (
          <>
            <dl className="school-analysis-grid school-analysis-facts">
              <div>
                <dt>학생수</dt>
                <dd>
                  {profile.studentCount === null
                    ? "미제공"
                    : `${profile.studentCount.toLocaleString("ko-KR")}명`}
                </dd>
              </div>
              <div>
                <dt>학교용지 면적</dt>
                <dd>
                  {profile.siteAreaM2 === null
                    ? profile.siteAreaNote
                      ? "공동사용 면적 확인 필요"
                      : "미제공"
                    : `${profile.siteAreaM2.toLocaleString("ko-KR")}㎡`}
                </dd>
              </div>
            </dl>
            {profile.siteAreaNote && <p>{profile.siteAreaNote}</p>}
            {profile.siteShared === "○" && (
              <p>용지를 공동사용하는 학교입니다.</p>
            )}
          </>
        ) : (
          <p>
            같은 연도의 학교 기본정보가 연결되지 않았습니다. 결산자료는 아래에서
            확인할 수 있습니다.
          </p>
        )}
      </section>
      <section
        className="school-analysis-panel"
        aria-labelledby="school-analysis-scale"
      >
        <h2 id="school-analysis-scale">학교 규모를 반영한 분석</h2>
        <p>
          {s.fiscalYear}년 결산과 같은 연도 학교알리미 공시정보를 함께 봅니다.
        </p>
        <div className="school-analysis-grid">
          {scaleCards.map((card) => (
            <article className="school-analysis-metric" key={card.label}>
              <h3>{card.label}</h3>
              <strong>
                {card.value === null
                  ? "계산 불가"
                  : `${card.value.toLocaleString("ko-KR", { maximumFractionDigits: card.unit === "원" ? 0 : 2 })}${card.unit}`}
              </strong>
              <p>
                {card.value === null
                  ? (scale.reason ?? card.missing)
                  : `${card.numerator} ÷ 학생수 ${scale.students?.toLocaleString("ko-KR")}명`}
              </p>
            </article>
          ))}
        </div>
        <p className="school-analysis-muted">
          학생수는 해당 연도 공시 기준이며 연평균 인원이 아닙니다. 금액은 원
          단위로 반올림합니다. 학생 1인당 세출결산액은 학생에게 직접 지급한
          금액이나 교육성과를 뜻하지 않습니다.
        </p>
      </section>
      <section className="school-analysis-panel">
        <div className="school-analysis-heading-row">
          <h2>한눈에 보는 세입과 세출</h2>
          <SourceLink url={s.sourceUrl} />
        </div>
        {s.currentBudget === null ? (
          <>
            <h3>원사이트에서 총괄표를 제공하지 않습니다</h3>
            <p>
              금액을 0으로 대체하지 않았습니다. 세입결산과 세출결산 탭에서
              확보된 자료를 탐색할 수 있습니다.
            </p>
          </>
        ) : (
          <div className="school-analysis-two-columns">
            <div>
              {[
                {
                  label: "세입결산",
                  value: s.incomeSettlement,
                  rate: metrics.incomeSettlementRate,
                },
                {
                  label: "세출결산",
                  value: s.expenseSettlement,
                  rate: metrics.expenseExecutionRate,
                },
              ].map((item) => (
                <div key={item.label} className="school-analysis-flow">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{money(item.value, "억원")} 억원</span>
                  </div>
                  <div
                    className="school-analysis-flow-track"
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        width: `${Math.max(0, Math.min(100, item.rate ?? 0))}%`,
                      }}
                    />
                  </div>
                  <p>{percent(item.rate)} · 예산현액 대비</p>
                </div>
              ))}
              <p className="school-analysis-surplus">
                세입 − 세출 = 세계잉여금{" "}
                <strong>{money(metrics.surplus)}원</strong>
              </p>
            </div>
            <div>
              <div className="school-analysis-table-wrap" tabIndex={0}>
                <table>
                  <caption>결산 총괄 · 단위: 원</caption>
                  <thead>
                    <tr>
                      <th scope="col">구분</th>
                      <th scope="col">세입</th>
                      <th scope="col">세출</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">예산현액</th>
                      <td>{money(s.currentBudget)}</td>
                      <td>{money(s.currentBudget)}</td>
                    </tr>
                    <tr>
                      <th scope="row">결산액</th>
                      <td>{money(s.incomeSettlement)}</td>
                      <td>{money(s.expenseSettlement)}</td>
                    </tr>
                    <tr>
                      <th scope="row">차액 / 집행잔액</th>
                      <td>{money(metrics.incomeDifference)}</td>
                      <td>{money(metrics.expenseDifference)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="school-analysis-muted">
                차액은 예산현액에서 결산액을 뺀 값입니다. 세계잉여금은
                세입결산액과 세출결산액의 차이입니다.
              </p>
              {s.surplus !== metrics.surplus && (
                <p className="school-analysis-notice">
                  원문 세계잉여금: {money(s.surplus)}원. 계산값과 차이가
                  있습니다.
                </p>
              )}
            </div>
          </div>
        )}
        {s.note && <p>{s.note}</p>}
      </section>
      <div className="school-analysis-two-columns school-analysis-prompts">
        <button onClick={() => onExplore("income")}>
          학교의 재원은 어디에서 올까요?{" "}
          <span>세입을 장·관·항·목 순서로 탐색</span>
        </button>
        <button onClick={() => onExplore("expense")}>
          예산은 어디에 사용되었을까요?{" "}
          <span>정책사업부터 세부항목까지 탐색</span>
        </button>
      </div>
    </>
  );
}

function AnalysisView({
  dataset,
  kind,
}: {
  dataset: BudgetDataset;
  kind: "income" | "expense";
}) {
  const bundles = bundleNumbers(
    kind === "expense" ? dataset.expenseRows : dataset.incomeRows,
  );
  if (!bundles.length)
    return (
      <p className="school-analysis-panel">
        수집된 {kind === "expense" ? "세출" : "세입"}결산 상세자료가 없습니다.
      </p>
    );
  return <Explorer dataset={dataset} kind={kind} bundles={bundles} />;
}

function Explorer({
  dataset: d,
  kind,
  bundles,
}: {
  dataset: BudgetDataset;
  kind: "income" | "expense";
  bundles: number[];
}) {
  const expense = kind === "expense";
  const [bundle, setBundle] = useState(bundles[0]);
  const [path, setPath] = useState<string[]>([]);
  const [unit, setUnit] = useState<MoneyUnit>("원");
  const [selected, setSelected] = useState<BudgetNode | null>(null);
  const nodes = useMemo(
    () =>
      expense
        ? getExpenseLevel(d.expenseRows, bundle, path)
        : getIncomeLevel(d.incomeRows, bundle, path),
    [expense, d, bundle, path],
  );
  const total = expense
    ? getTotal(d.expenseRows, bundle)
    : getTotal(d.incomeRows, bundle);
  const summaryTotal = expense
    ? d.summary.expenseSettlement
    : d.summary.incomeSettlement;
  const levels = expense
    ? ["정책사업", "단위사업", "세부사업", "세부항목"]
    : ["장", "관", "항", "목"];
  const select = useCallback((node: BudgetNode) => {
    if (node.hasChildren) {
      setPath(node.path);
      setSelected(null);
    } else setSelected(node);
  }, []);
  const selectTop = (node: BudgetNode) => {
    setPath(node.path.slice(0, -1));
    setSelected(node);
    const panel = document.getElementById("school-analysis-panel");
    panel?.scrollIntoView?.({ block: "start", behavior: "auto" });
    panel?.focus({ preventScroll: true });
  };
  return (
    <>
      <section className="school-analysis-panel">
        <div className="school-analysis-heading-row">
          <div>
            <h2>{expense ? "세출" : "세입"}결산 탐색</h2>
            <p>항목을 선택해 한 단계 더 살펴보세요.</p>
          </div>
          <div className="school-analysis-total">
            <span>선택 묶음 전체 결산액</span>
            <strong>{money(total.settlementAmount)}원</strong>
            <SourceLink url={total.sourceUrl} />
          </div>
        </div>
        {summaryTotal !== null && summaryTotal !== total.settlementAmount && (
          <p className="school-analysis-notice">
            선택한 원문 묶음의 합계({money(total.settlementAmount)}원)가 총괄표(
            {money(summaryTotal)}원)와 다릅니다. 비중은 선택 묶음 합계를
            기준으로 합니다.
          </p>
        )}
        <div className="school-analysis-controls">
          <nav aria-label="분석 경로" className="school-analysis-breadcrumb">
            <button
              onClick={() => {
                setPath([]);
                setSelected(null);
              }}
            >
              전체
            </button>
            {path.map((part, index) => (
              <span key={index}>
                {" "}
                ›{" "}
                <button
                  aria-current={
                    index === path.length - 1 ? "location" : undefined
                  }
                  onClick={() => {
                    setPath(path.slice(0, index + 1));
                    setSelected(null);
                  }}
                >
                  {part}
                </button>
              </span>
            ))}
          </nav>
          <div>
            {bundles.length > 1 && (
              <label>
                원문 묶음
                <select
                  value={bundle}
                  onChange={(event) => {
                    setBundle(Number(event.target.value));
                    setPath([]);
                    setSelected(null);
                  }}
                >
                  {bundles.map((value) => (
                    <option key={value} value={value}>
                      묶음 {value}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              표 단위
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as MoneyUnit)}
              >
                {["원", "만원", "억원"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {bundles.length > 1 && (
          <p className="school-analysis-notice">
            서로 다른 원문 묶음이 {bundles.length}개 있습니다. 현재 묶음{" "}
            {bundle}만 분석하며 서로 합산하지 않습니다.
          </p>
        )}
        {expense ? (
          <ExpenseMetrics dataset={d} bundle={bundle} />
        ) : (
          <IncomeMetrics dataset={d} bundle={bundle} />
        )}
        <div className="school-analysis-heading-row">
          <h3>
            {path.length + 1} / 4 단계 · {levels[path.length]}
          </h3>
          <span>
            {nodes.length}개 항목 · 전체 {expense ? "세출" : "세입"} 대비 비중
          </span>
        </div>
        <SchoolTreemap nodes={nodes} onSelect={select} />
        {selected && (
          <aside className="school-analysis-selected" aria-label="선택 항목">
            <div className="school-analysis-heading-row">
              <h3>{selected.name}</h3>
              <button
                aria-label="선택 항목 닫기"
                onClick={() => setSelected(null)}
              >
                닫기
              </button>
            </div>
            <p>{selected.path.join(" › ")}</p>
            <dl className="school-analysis-grid school-analysis-facts">
              {[
                ["예산현액", `${money(selected.currentBudget)}원`],
                ["결산액", `${money(selected.settlementAmount)}원`],
                ["차액", `${money(selected.difference)}원`],
                ["결산률", percent(selected.settlementRate)],
                ["전체 대비 비중", percent(selected.share)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {selected.sourceDifference !== selected.difference && (
              <p>
                원문 차액: {money(selected.sourceDifference)}원 (계산값과 다름)
              </p>
            )}
            <SourceLink url={selected.sourceUrl} />
          </aside>
        )}
        <h3>
          {path.at(-1) ?? "전체"} · {levels[path.length]}별 내역
        </h3>
        <DetailTable
          nodes={nodes}
          unit={unit}
          expense={expense}
          onSelect={select}
        />
        <p className="school-analysis-muted">
          현재 단계의 행만 표시합니다. * 표시는 원문 차액과 계산 차액이 다른
          항목입니다.
        </p>
      </section>
      {expense && (
        <div className="school-analysis-two-columns">
          <TopItems
            title="결산액 상위 10개 세부항목"
            nodes={getTopExpenseItems(
              d.expenseRows,
              bundle,
              "settlementAmount",
            )}
            metric="settlementAmount"
            onSelect={selectTop}
          />
          <TopItems
            title="집행잔액 상위 5개 세부항목"
            nodes={getTopExpenseItems(
              d.expenseRows,
              bundle,
              "difference",
            ).slice(0, 5)}
            metric="difference"
            onSelect={selectTop}
          />
        </div>
      )}
    </>
  );
}

function IncomeMetrics({
  dataset,
  bundle,
}: {
  dataset: BudgetDataset;
  bundle: number;
}) {
  return (
    <section
      className="school-analysis-metric-section"
      aria-labelledby="school-analysis-income"
    >
      <h3 id="school-analysis-income">세입 구조 분석</h3>
      <p>선택 묶음 총 세입을 기준으로 재원 구성과 세입결산률을 확인합니다.</p>
      <div className="school-analysis-grid">
        {incomeStructureMetrics(dataset.incomeRows, bundle).map((metric) => (
          <article className="school-analysis-metric" key={metric.id}>
            <h4>{metric.label}</h4>
            <strong>{percent(metric.rate)}</strong>
            <dl>
              <div>
                <dt>분자 · {metric.numeratorLabel}</dt>
                <dd>{money(metric.numerator)}원</dd>
              </div>
              <div>
                <dt>분모 · {metric.denominatorLabel}</dt>
                <dd>{money(metric.denominator)}원</dd>
              </div>
            </dl>
            <p>{metric.formula}</p>
            <p>{metric.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExpenseMetrics({
  dataset,
  bundle,
}: {
  dataset: BudgetDataset;
  bundle: number;
}) {
  const rigid = rigidExpenseSummary(dataset.expenseRows, bundle);
  const breakdown = rigidExpenseBreakdown(dataset.expenseRows, bundle);
  return (
    <>
      <section
        className="school-analysis-metric-section"
        aria-labelledby="school-analysis-insights"
      >
        <h3 id="school-analysis-insights">핵심 지출 분석</h3>
        <div className="school-analysis-grid">
          {expenseAnalysisMetrics(dataset.expenseRows, bundle).map((metric) => (
            <article className="school-analysis-metric" key={metric.id}>
              <h4>{metric.label}</h4>
              <strong>{percent(metric.rate)}</strong>
              <p>{money(metric.settlementAmount)}원</p>
              <p>{metric.description}</p>
            </article>
          ))}
        </div>
        <p className="school-analysis-muted">
          전체 세출결산액 대비 비중입니다. 각 카드는 관련 영역을 보여 주므로
          서로 중복될 수 있습니다. 공공요금은 세부항목 명칭으로 파생 분류합니다.
        </p>
      </section>
      <section
        className="school-analysis-metric-section"
        aria-labelledby="school-analysis-rigid"
      >
        <h3 id="school-analysis-rigid">경직성 경비</h3>
        <p>
          반복적·필수적 성격의 지출을 세부항목 명칭으로 파생 분류해 보여 줍니다.
        </p>
        <div className="school-analysis-rigid-summary">
          <div>
            경직성 경비 총 결산액
            <strong>{money(rigid.totalSettlementAmount)}원</strong>
          </div>
          <div>
            전체 세출 대비 비중<strong>{percent(rigid.rate)}</strong>
          </div>
          {rigid.groups.map((group) => (
            <div key={group.group}>
              {group.label}
              <strong>{money(group.settlementAmount)}원</strong>
            </div>
          ))}
        </div>
        <div className="school-analysis-grid">
          {rigid.groups.map((group) => (
            <article className="school-analysis-metric" key={group.group}>
              <h4>{group.group}</h4>
              <dl>
                {breakdown
                  .filter((item) => item.group === group.group)
                  .map((item) => (
                    <div key={item.id}>
                      <dt>{item.label}</dt>
                      <dd>{money(item.settlementAmount)}원</dd>
                    </div>
                  ))}
              </dl>
            </article>
          ))}
        </div>
        <p className="school-analysis-muted">
          원본 회계분류는 변경하지 않습니다. 명칭 기반 파생 분류이므로
          회계분류와 별도로 참고해 주세요.
        </p>
      </section>
    </>
  );
}

function DetailTable({
  nodes,
  unit,
  expense,
  onSelect,
}: {
  nodes: BudgetNode[];
  unit: MoneyUnit;
  expense: boolean;
  onSelect: (node: BudgetNode) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "settlementAmount", direction: "desc" },
  );
  const columns: Array<[SortKey, string]> = [
    ["currentBudget", "예산현액"],
    ["settlementAmount", "결산액"],
    ["difference", expense ? "집행잔액" : "차액"],
  ];
  return (
    <div
      className="school-analysis-table-wrap"
      role="region"
      aria-label="현재 단계 분석표"
      tabIndex={0}
    >
      <table className="school-analysis-detail-table">
        <caption>현재 단계 분석표 · 단위 {unit}</caption>
        <thead>
          <tr>
            <th scope="col">항목</th>
            {columns.map(([key, label]) => (
              <th
                key={key}
                scope="col"
                aria-sort={
                  sort.key === key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  aria-label={`${label} 정렬`}
                  onClick={() =>
                    setSort({
                      key,
                      direction:
                        sort.key === key && sort.direction === "desc"
                          ? "asc"
                          : "desc",
                    })
                  }
                >
                  {label} ↕
                </button>
              </th>
            ))}
            <th scope="col">{expense ? "집행률" : "결산률"}</th>
            <th scope="col">전체 대비 비중</th>
            <th scope="col">원문</th>
          </tr>
        </thead>
        <tbody>
          {sortNodes(nodes, sort.key, sort.direction).map((node) => (
            <tr key={node.id}>
              <th scope="row">
                <button
                  aria-label={`${node.name} ${node.hasChildren ? "상세 보기" : "선택"}`}
                  onClick={() => onSelect(node)}
                >
                  {node.name}
                </button>
              </th>
              <td title={`${money(node.currentBudget)}원`}>
                {money(node.currentBudget, unit)}
              </td>
              <td title={`${money(node.settlementAmount)}원`}>
                {money(node.settlementAmount, unit)}
              </td>
              <td
                title={
                  node.sourceDifference !== node.difference
                    ? `원문 차액: ${money(node.sourceDifference)}원`
                    : `${money(node.difference)}원`
                }
              >
                {money(node.difference, unit)}
                {node.sourceDifference !== node.difference && (
                  <span aria-label="원문 차액과 다름"> *</span>
                )}
              </td>
              <td>{percent(node.settlementRate)}</td>
              <td>{percent(node.share)}</td>
              <td>
                <SourceLink url={node.sourceUrl} label="원문" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!nodes.length && <p>이 단계에 표시할 항목이 없습니다.</p>}
    </div>
  );
}

function TopItems({
  title,
  nodes,
  metric,
  onSelect,
}: {
  title: string;
  nodes: BudgetNode[];
  metric: "difference" | "settlementAmount";
  onSelect: (node: BudgetNode) => void;
}) {
  return (
    <section
      className="school-analysis-panel school-analysis-top"
      aria-label={title}
    >
      <h3>{title}</h3>
      <ol>
        {nodes.map((node) => (
          <li key={node.id}>
            <button onClick={() => onSelect(node)}>
              <span>
                {node.name}
                <small>{node.path.slice(0, -1).join(" › ")}</small>
              </span>
              <strong>{money(node[metric])}원</strong>
            </button>
          </li>
        ))}
      </ol>
      {!nodes.length && <p>해당하는 양수 항목이 없습니다.</p>}
    </section>
  );
}
