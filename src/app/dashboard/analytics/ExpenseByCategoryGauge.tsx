"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

type ExpenseEntry = {
  name: string;
  amount: number;
  color: string;
};

type ExpenseBreakdown = {
  total: number;
  entries: ExpenseEntry[];
};

type GaugeSegment = {
  name: string;
  amount: number;
  color: string;
  dasharray: string;
  dashoffset: number;
};

const SEMI_GAUGE_PATH = "M 48 154 A 112 112 0 0 1 272 154";
const SEMI_PATH_LENGTH = 100;
const SEGMENT_GAP = 7.3;
const MIN_SEGMENT_LENGTH = 1.8;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

export default function ExpenseByCategoryGauge() {
  const [data, setData] = useState<ExpenseBreakdown>({ total: 0, entries: [] });
  const [hoveredSegment, setHoveredSegment] = useState<{
    name: string;
    amount: number;
    x: number;
    y: number;
  } | null>(null);
  const gaugeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ExpenseBreakdown>).detail;
      if (!detail) return;
      setData(detail);
    };

    window.addEventListener("budget:expense-breakdown", handler as EventListener);
    return () => {
      window.removeEventListener(
        "budget:expense-breakdown",
        handler as EventListener
      );
    };
  }, []);

  const total = data.total;
  const entries = data.entries;

  const segments = useMemo<GaugeSegment[]>(() => {
    if (!total || entries.length === 0) return [];

    const safeEntries = entries.filter((entry) => entry.amount > 0);
    if (safeEntries.length === 0) return [];

    const gap = safeEntries.length > 1 ? SEGMENT_GAP : 0;
    const availableLength = Math.max(
      SEMI_PATH_LENGTH - gap * (safeEntries.length - 1),
      0
    );

    const rawLengths = safeEntries.map(
      (entry) => (entry.amount / total) * availableLength
    );
    const minLength = Math.min(
      MIN_SEGMENT_LENGTH,
      availableLength / safeEntries.length
    );

    const adjustedLengths = [...rawLengths];
    let adjustable = rawLengths.map((_, index) => index);

    while (adjustable.length > 0) {
      const short = adjustable.filter((index) => adjustedLengths[index] < minLength);
      if (short.length === 0) break;

      for (const index of short) adjustedLengths[index] = minLength;
      adjustable = adjustable.filter((index) => !short.includes(index));
      if (adjustable.length === 0) break;

      const fixedTotal = adjustedLengths.reduce(
        (sum, length, index) => (adjustable.includes(index) ? sum : sum + length),
        0
      );
      const remainingLength = Math.max(availableLength - fixedTotal, 0);
      const rawAdjustableTotal = adjustable.reduce(
        (sum, index) => sum + rawLengths[index],
        0
      );

      if (rawAdjustableTotal === 0) {
        const evenLength = remainingLength / adjustable.length;
        for (const index of adjustable) adjustedLengths[index] = evenLength;
      } else {
        for (const index of adjustable) {
          adjustedLengths[index] =
            (rawLengths[index] / rawAdjustableTotal) * remainingLength;
        }
      }
    }

    let offset = 0;
    return safeEntries.map((entry, index) => {
      const visibleLength = adjustedLengths[index];
      const segment: GaugeSegment = {
        name: entry.name,
        amount: entry.amount,
        color: entry.color,
        dasharray: `${visibleLength} ${SEMI_PATH_LENGTH - visibleLength}`,
        dashoffset: -offset,
      };
      offset += visibleLength + gap;
      return segment;
    });
  }, [entries, total]);

  const updateTooltipPosition = (
    event: ReactMouseEvent<SVGPathElement>,
    segment: Pick<GaugeSegment, "name" | "amount">
  ) => {
    const rect = gaugeRef.current?.getBoundingClientRect();
    if (!rect) return;

    setHoveredSegment({
      name: segment.name,
      amount: segment.amount,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return (
    <div className="expense-gauge-card card card-glow p-6">
      <h3 className="text-xl font-semibold text-foreground mb-4">
        Expense by Category
      </h3>
      <div className="expense-gauge-header-divider" />

      <div className="expense-gauge expense-gauge--semi" ref={gaugeRef}>
        <svg viewBox="0 0 320 190" className="expense-gauge-svg" aria-hidden="true">
          <path
            d={SEMI_GAUGE_PATH}
            fill="none"
            stroke="color-mix(in srgb, var(--muted) 26%, transparent)"
            strokeWidth="24"
            strokeLinecap="round"
            pathLength={SEMI_PATH_LENGTH}
          />
          {segments.map((segment) => (
            <path
              key={segment.name}
              d={SEMI_GAUGE_PATH}
              className="expense-gauge-segment"
              fill="none"
              stroke={segment.color}
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray={segment.dasharray}
              strokeDashoffset={segment.dashoffset}
              pathLength={SEMI_PATH_LENGTH}
              onMouseEnter={(event) => updateTooltipPosition(event, segment)}
              onMouseMove={(event) => updateTooltipPosition(event, segment)}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <title>
                {segment.name}: {formatCurrency(segment.amount)}
              </title>
            </path>
          ))}
        </svg>

        {hoveredSegment && (
          <div
            className="expense-gauge-tooltip"
            style={{
              left: hoveredSegment.x,
              top: hoveredSegment.y,
            }}
          >
            <span className="expense-gauge-tooltip-name">{hoveredSegment.name}</span>
            <span>{formatCurrency(hoveredSegment.amount)}</span>
          </div>
        )}

        <div className="expense-gauge-center">
          <p className="expense-gauge-value">
            {total ? formatCurrency(total) : formatCurrency(0)}
          </p>
          <p className="expense-gauge-label">Total expenses</p>
        </div>
      </div>

      <div className="expense-gauge-list">
        {entries.map((entry) => {
          const percentage = total
            ? ((entry.amount / total) * 100).toFixed(1)
            : "0.0";

          return (
            <div key={entry.name} className="expense-gauge-item">
              <div className="expense-gauge-item-main">
                <span
                  className="expense-gauge-dot"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="expense-gauge-name">{entry.name}</span>
              </div>
              <div className="expense-gauge-meta">
                <span>{formatCurrency(entry.amount)}</span>
                <span className="expense-gauge-sep">|</span>
                <span>{percentage}%</span>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No expense data for this period.
          </p>
        )}
      </div>
    </div>
  );
}
