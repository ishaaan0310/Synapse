import React, { useEffect, useRef, useState } from 'react';

// Lightweight SVG charts. No chart library needed.
// data: [{ label: 'Mon', value: 7.5 }, ...]

const HEIGHT = 240;
const PAD = { top: 20, right: 16, bottom: 30, left: 44 };

// Charts draw at their real pixel width so text stays the same size
// on phones and wide screens.
function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const update = () => setWidth(Math.max(260, Math.round(el.clientWidth)));
    update();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// Round the axis maximum so the 4 gridlines land on friendly numbers
const niceMax = (max) => {
  if (max <= 0) return 1;
  const rawStep = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => s * magnitude >= rawStep) || 10;
  return step * magnitude * 4;
};

const formatTick = (value) =>
  value >= 1000 ? `${Math.round(value / 100) / 10}k` : Math.round(value * 100) / 100;

function Axes({ max, labels, xFor, width }) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  // Thin out x labels when there are many points
  const every = Math.ceil(labels.length / Math.max(2, Math.floor(width / 80)));

  return (
    <g className="chart-axes">
      {ticks.map((tick) => {
        const y = PAD.top + innerH - (tick / max) * innerH;
        return (
          <g key={tick}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} className="chart-grid" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="chart-label">
              {formatTick(tick)}
            </text>
          </g>
        );
      })}
      {labels.map((label, i) =>
        i % every === 0 ? (
          <text key={`${label}-${i}`} x={xFor(i)} y={HEIGHT - 8} textAnchor="middle" className="chart-label">
            {label}
          </text>
        ) : null
      )}
    </g>
  );
}

function TargetLine({ target, max, label, width }) {
  if (!target || target > max) return null;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const y = PAD.top + innerH - (target / max) * innerH;
  return (
    <g>
      <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} className="chart-target" />
      <text x={PAD.left + 6} y={y - 6} textAnchor="start" className="chart-target-label">
        {label || `Target ${formatTick(target)}`}
      </text>
    </g>
  );
}

export function LineChart({ data, color = 'var(--primary)', unit = '', target, targetLabel }) {
  const [hover, setHover] = useState(null);
  const [ref, WIDTH] = useWidth();

  const points = data.filter((d) => typeof d.value === 'number');

  if (points.length < 2) {
    return (
      <div className="chart" ref={ref}>
        <p className="chart-empty">Log at least 2 entries to see this chart.</p>
      </div>
    );
  }

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...points.map((d) => d.value), target || 0) * 1.1);

  const xFor = (i) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yFor = (v) => PAD.top + innerH - (v / max) * innerH;

  const path = points.map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(d.value)}`).join(' ');
  const area = `${path} L${xFor(points.length - 1)},${PAD.top + innerH} L${xFor(0)},${PAD.top + innerH} Z`;

  return (
    <div className="chart" ref={ref}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Line chart">
        <Axes max={max} labels={points.map((d) => d.label)} xFor={xFor} width={WIDTH} />
        <TargetLine target={target} max={max} label={targetLabel} width={WIDTH} />
        <path d={area} fill={color} opacity="0.12" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((d, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={xFor(i)} cy={yFor(d.value)} r="12" fill="transparent" />
            <circle cx={xFor(i)} cy={yFor(d.value)} r={hover === i ? 5 : 3.5} fill={color} className="chart-dot" />
          </g>
        ))}
        {hover !== null && (
          <g className="chart-tooltip">
            <rect
              x={Math.min(Math.max(xFor(hover) - 50, 0), WIDTH - 100)}
              y={Math.max(yFor(points[hover].value) - 40, 0)}
              width="100"
              height="28"
              rx="6"
            />
            <text
              x={Math.min(Math.max(xFor(hover), 50), WIDTH - 50)}
              y={Math.max(yFor(points[hover].value) - 22, 18)}
              textAnchor="middle"
            >
              {points[hover].value.toLocaleString()} {unit}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function BarChart({ data, color = 'var(--primary)', unit = '', target, targetLabel }) {
  const [hover, setHover] = useState(null);
  const [ref, WIDTH] = useWidth();

  if (!data.length || data.every((d) => !d.value)) {
    return (
      <div className="chart" ref={ref}>
        <p className="chart-empty">No data for this period yet.</p>
      </div>
    );
  }

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value || 0), target || 0) * 1.1);
  const slot = innerW / data.length;
  const barW = Math.min(slot * 0.6, 48);

  const xFor = (i) => PAD.left + slot * i + slot / 2;

  return (
    <div className="chart" ref={ref}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Bar chart">
        <Axes max={max} labels={data.map((d) => d.label)} xFor={xFor} width={WIDTH} />
        {data.map((d, i) => {
          const h = ((d.value || 0) / max) * innerH;
          const over = target && d.value > target * 1.1;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={xFor(i) - barW / 2}
                y={PAD.top + innerH - h}
                width={barW}
                height={Math.max(h, d.value ? 2 : 0)}
                rx="5"
                fill={over ? 'var(--warning)' : color}
                opacity={hover === null || hover === i ? 1 : 0.55}
              />
              {hover === i && (
                <text x={xFor(i)} y={PAD.top + innerH - h - 8} textAnchor="middle" className="chart-value">
                  {Math.round(d.value).toLocaleString()} {unit}
                </text>
              )}
            </g>
          );
        })}
        <TargetLine target={target} max={max} label={targetLabel} width={WIDTH} />
      </svg>
    </div>
  );
}

export function ProgressRing({ value = 0, max = 100, size = 120, stroke = 10, color = 'var(--primary)', label, sublabel }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <div className="ring" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-progress"
        />
      </svg>
      <div className="ring-center">
        <strong>{label}</strong>
        {sublabel && <small>{sublabel}</small>}
      </div>
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, color = 'var(--primary)' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100">
      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
