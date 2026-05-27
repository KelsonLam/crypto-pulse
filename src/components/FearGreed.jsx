import { useEffect, useState } from "react";
import { fetchFearGreed } from "../api.js";

// A semicircular gauge that shows the crypto Fear and Greed index, a widely
// followed measure of market mood on a scale from 0 (extreme fear) to 100
// (extreme greed). Drawn as inline SVG with no charting library.

const RADIUS = 52;
const CIRCUMFERENCE = Math.PI * RADIUS; // length of the half circle

// Choose a colour for the needle and arc based on the value.
function colourFor(value) {
  if (value < 25) return "#f87171";
  if (value < 45) return "#fb923c";
  if (value < 55) return "#facc15";
  if (value < 75) return "#a3e635";
  return "#34d399";
}

export default function FearGreed() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchFearGreed()
      .then((result) => active && result && setData(result))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  // The gauge is hidden entirely if the optional service cannot be reached,
  // so it never leaves an empty box on the page.
  if (failed || !data) return null;

  const value = Math.max(0, Math.min(100, data.value));
  const colour = colourFor(value);
  // The arc sweeps 180 degrees, so the dash offset maps the value onto it.
  const filled = (value / 100) * CIRCUMFERENCE;

  return (
    <div className="fng" aria-label={`Fear and Greed index ${value}, ${data.label}`}>
      <svg viewBox="0 0 140 84" className="fng__svg" role="img">
        <path
          d="M 18 74 A 52 52 0 0 1 122 74"
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 18 74 A 52 52 0 0 1 122 74"
          fill="none"
          stroke={colour}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
        />
        <text x="70" y="62" textAnchor="middle" className="fng__value" fill="var(--text)">
          {value}
        </text>
      </svg>
      <div className="fng__caption">
        <span className="overview__label">Fear and Greed</span>
        <span className="fng__label" style={{ color: colour }}>
          {data.label}
        </span>
      </div>
    </div>
  );
}
