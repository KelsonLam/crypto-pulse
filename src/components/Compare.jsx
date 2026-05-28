import { useEffect, useMemo, useState } from "react";
import { fetchMarketChart } from "../api.js";
import { formatPercent } from "../format.js";

// A modal that overlays the performance of up to three coins on one chart.
// Each line is normalised to its starting price, so coins of very different
// prices can be compared on a single percentage scale.

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
];

const LINE_COLOURS = ["#6ee7b7", "#60a5fa", "#f472b6"];
const MAX_COINS = 3;

const WIDTH = 660;
const HEIGHT = 280;
const PADDING = 28;

export default function Compare({ coins, onClose }) {
  const [selected, setSelected] = useState(() => coins.slice(0, 2).map((c) => c.id));
  const [days, setDays] = useState(30);
  const [series, setSeries] = useState({});
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load a price history for every selected coin whenever the selection or
  // the range changes. The requests run together for a quicker result.
  useEffect(() => {
    let active = true;
    if (selected.length === 0) {
      setSeries({});
      setStatus("ready");
      return undefined;
    }
    setStatus("loading");
    Promise.all(
      selected.map((id) =>
        fetchMarketChart(id, "usd", days)
          .then((prices) => [id, prices])
          .catch(() => [id, []])
      )
    )
      .then((entries) => {
        if (!active) return;
        setSeries(Object.fromEntries(entries));
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [selected, days, reloadKey]);

  function toggleCoin(id) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_COINS) return current;
      return [...current, id];
    });
  }

  // Turn each price history into a list of percentage changes from its start,
  // then work out the shared vertical range across all of the lines.
  const chart = useMemo(() => {
    const lines = selected
      .map((id, index) => {
        const prices = series[id] || [];
        if (prices.length < 2) return null;
        const base = prices[0][1];
        if (!base) return null;
        const points = prices.map((p) => ((p[1] - base) / base) * 100);
        const coin = coins.find((c) => c.id === id);
        return {
          id,
          symbol: coin ? coin.symbol.toUpperCase() : id,
          colour: LINE_COLOURS[index % LINE_COLOURS.length],
          points,
          last: points[points.length - 1],
        };
      })
      .filter(Boolean);

    if (lines.length === 0) return null;

    let min = Infinity;
    let max = -Infinity;
    lines.forEach((line) => {
      line.points.forEach((value) => {
        if (value < min) min = value;
        if (value > max) max = value;
      });
    });
    if (min === max) {
      min -= 1;
      max += 1;
    }
    return { lines, min, max };
  }, [series, selected, coins]);

  function buildPath(points, min, max) {
    const usableW = WIDTH - PADDING * 2;
    const usableH = HEIGHT - PADDING * 2;
    const range = max - min || 1;
    return points
      .map((value, index) => {
        const x = PADDING + (index / (points.length - 1)) * usableW;
        const y = PADDING + (1 - (value - min) / range) * usableH;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  // The y position of the zero line, so the reader can see gains versus losses.
  const zeroY = chart
    ? PADDING + (1 - (0 - chart.min) / (chart.max - chart.min || 1)) * (HEIGHT - PADDING * 2)
    : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label="Compare coins"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Compare performance</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close comparison">
            &times;
          </button>
        </header>

        <p className="muted compare__hint">
          Pick up to three coins. Each line shows the percentage change from the
          start of the period, so they can be compared on the same scale.
        </p>

        <div className="compare__picker">
          {coins.slice(0, 15).map((coin) => {
            const on = selected.includes(coin.id);
            const colourIndex = selected.indexOf(coin.id);
            return (
              <button
                key={coin.id}
                className={`compare__chip ${on ? "is-on" : ""}`}
                onClick={() => toggleCoin(coin.id)}
                style={on ? { borderColor: LINE_COLOURS[colourIndex % LINE_COLOURS.length] } : undefined}
              >
                <img src={coin.image} alt="" />
                {coin.symbol.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div className="range-switch" role="group" aria-label="Comparison time range">
          {RANGES.map((range) => (
            <button
              key={range.days}
              className={`range-switch__option ${days === range.days ? "is-active" : ""}`}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="modal__chart">
          {status === "loading" && <div className="chart chart--empty">Loading comparison...</div>}
          {status !== "loading" && !chart && selected.length === 0 && (
            <div className="chart chart--empty">Select at least one coin to compare.</div>
          )}
          {status !== "loading" && !chart && selected.length > 0 && (
            <div className="chart chart--empty chart--message">
              <p>
                We could not load the price data just now. The free CoinGecko API
                limits how often it can be called, so please wait a few seconds and
                try again.
              </p>
              <button className="refresh-button" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </button>
            </div>
          )}
          {status !== "loading" && chart && (
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart__svg" role="img" aria-label="Performance comparison">
              <line
                x1={PADDING}
                y1={zeroY}
                x2={WIDTH - PADDING}
                y2={zeroY}
                stroke="var(--grid)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              {chart.lines.map((line) => (
                <path
                  key={line.id}
                  d={buildPath(line.points, chart.min, chart.max)}
                  fill="none"
                  stroke={line.colour}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          )}
        </div>

        {chart && (
          <div className="compare__legend">
            {chart.lines.map((line) => (
              <div key={line.id} className="compare__legend-item">
                <span className="compare__swatch" style={{ background: line.colour }} />
                <span className="coin-name__title">{line.symbol}</span>
                <span className={line.last >= 0 ? "change--up" : "change--down"}>
                  {formatPercent(line.last)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
