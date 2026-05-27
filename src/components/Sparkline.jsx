// A compact line chart drawn as inline SVG, with no external dependencies.
// It is used in the table to show each coin's seven day price trend.

export default function Sparkline({ values, positive, width = 120, height = 40 }) {
  if (!values || values.length < 2) {
    return <div className="sparkline sparkline--empty" aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const stroke = positive ? "var(--up)" : "var(--down)";
  const areaPath = `M0,${height} L${points.join(" L")} L${width},${height} Z`;
  const gradientId = `spark-${positive ? "up" : "down"}`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={positive ? "Upward seven day trend" : "Downward seven day trend"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
