import { useEffect, useRef, useState } from "react";
import { money } from "./calculations";
import type { BudgetNode } from "./types";

export default function SchoolTreemap({
  nodes,
  onSelect,
}: {
  nodes: BudgetNode[];
  onSelect: (node: BudgetNode) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setFailed(false);
    void import("echarts")
      .then(({ init }) => {
        if (disposed || !host.current) return;
        const chart = init(host.current, undefined, { renderer: "canvas" });
        cleanup = () => chart.dispose();
        chart.setOption({
          animation: false,
          color: [
            "#217a72",
            "#4a9690",
            "#33698b",
            "#6396ae",
            "#bc6846",
            "#758b58",
          ],
          tooltip: { show: false },
          series: [
            {
              type: "treemap",
              roam: false,
              nodeClick: false,
              breadcrumb: { show: false },
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              label: {
                show: true,
                formatter: "{b}",
                color: "#fff",
                fontSize: 14,
              },
              itemStyle: { borderColor: "#fff", borderWidth: 3, gapWidth: 3 },
              data: nodes
                .filter((node) => node.settlementAmount > 0)
                .map((node) => ({ ...node, value: node.settlementAmount })),
            },
          ],
        });
        chart.on("click", (event) => {
          const id = (event.data as { id?: string } | undefined)?.id;
          const node = nodes.find((candidate) => candidate.id === id);
          if (node) onSelect(node);
        });
        const resize = () => chart.resize();
        const observer =
          typeof ResizeObserver === "undefined"
            ? undefined
            : new ResizeObserver(resize);
        observer?.observe(host.current);
        window.addEventListener("resize", resize);
        cleanup = () => {
          observer?.disconnect();
          window.removeEventListener("resize", resize);
          chart.dispose();
        };
      })
      .catch(() => {
        cleanup?.();
        cleanup = undefined;
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [nodes, onSelect]);
  return (
    <div className="school-analysis-treemap">
      <div ref={host} className="school-analysis-chart" aria-hidden="true" />
      {failed && (
        <p className="school-analysis-muted">
          차트를 표시할 수 없습니다. 아래 금액 목록과 상세표에서 모든 항목을
          확인할 수 있습니다.
        </p>
      )}
      <p className="school-analysis-muted">
        넓이가 클수록 결산액이 큽니다. 0원·음수 항목도 아래 목록과 표에
        표시합니다.
      </p>
      <ul
        className="school-analysis-chart-values"
        aria-label="트리맵 금액 목록"
      >
        {nodes.map((node) => (
          <li key={node.id}>
            <button onClick={() => onSelect(node)}>
              <span>
                {node.name}
                {node.hasChildren ? " ›" : ""}
              </span>
              <strong>{money(node.settlementAmount)}원</strong>
            </button>
          </li>
        ))}
      </ul>
      {!nodes.length && <p>이 단계에 표시할 항목이 없습니다.</p>}
    </div>
  );
}
