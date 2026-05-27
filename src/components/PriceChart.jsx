import { useMemo, useRef, useState } from "react";
import { formatPrice } from "../format.js";

// An interactive line chart for the detail view. Moving the pointer across
// the chart reveals the price and date at that moment. Drawn as inline SVG.

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = 8;

export default function PriceChart({ prices, currency, positive }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const geometry = useMemo(() => {
    if (!prices || prices.length < 2) return null;
    const values = prices.map((point) => point[1]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const usableW = WIDTH - PADDING * 2;
    const usableH = HEIGHT - PADDING * 2;
    const stepX = usableW / (prices.length - 1);

    const coords = prices.map((point, index) => {
      const x = PADDING + index * stepX;
      const y = PADDING + (1 - (point[1] - min) / range) * usableH;
      return { x, y, value: point[1], time: point[0] };
    });
    return { coords, stepX };
  }, [prices]);

  if (!geometry) {
    return <div className="chart chart--empty">No chart data is available.</div>;
  }

  const { coords, stepX } = geometry;
  const stroke = positive ? "var(--up)" : "var(--down)";
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath = `M${PADDING},${HEIGHT - PADDING} L${linePoints
    .split(" ")
    .join(" L")} L${WIDTH - PADDING},${HEIGHT - PADDING} Z`;

  function handleMove(event) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let index = Math.round((relativeX - PADDING) / stepX);
    index = Math.max(0, Math.min(coords.length - 1, index));
    setHover(coords[index]);
  }

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="chart__svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Seven day price history"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#chart-fill)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hover && (
          <g>
            <line
              x1={hover.x}
              y1={PADDING}
              x2={hover.x}
              y2={HEIGHT - PADDING}
              stroke="var(--grid)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <circle cx={hover.x} cy={hover.y} r="5" fill={stroke} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      <div className="chart__readout">
        {hover ? (
          <>
            <span className="chart__price">{formatPrice(hover.value, currency)}</span>
            <span className="chart__date">
              {new Date(hover.time).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </>
        ) : (
          <span className="chart__hint">Hover over the chart to inspect a point.</span>
        )}
      </div>
    </div>
  );
}
