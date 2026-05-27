import { useEffect, useMemo, useState } from "react";
import PriceChart from "./PriceChart.jsx";
import { fetchMarketChart, fetchCoinInfo } from "../api.js";
import { formatPrice, formatCompact, formatPercent } from "../format.js";

// The time ranges offered for the detail chart, paired with the number of
// days each one requests from the API.
const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "1y", days: 365 },
];

// A modal dialog that shows a single coin in detail, including a price chart
// with selectable time ranges, key statistics, and community sentiment.

export default function CoinDetail({ coin, currency, onClose, onAddAlert }) {
  const [days, setDays] = useState(7);
  const [prices, setPrices] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [sentiment, setSentiment] = useState(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertSaved, setAlertSaved] = useState(false);

  // Load the price history whenever the coin, currency, or range changes.
  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetchMarketChart(coin.id, currency, days)
      .then((data) => {
        if (!active) return;
        setPrices(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error.message);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [coin.id, currency, days]);

  // Load the community sentiment once when the coin opens. It is optional,
  // so any failure is ignored rather than shown as an error.
  useEffect(() => {
    let active = true;
    setSentiment(null);
    fetchCoinInfo(coin.id)
      .then((info) => {
        if (!active) return;
        const up = info?.sentiment_votes_up_percentage;
        if (typeof up === "number") setSentiment(up);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [coin.id]);

  // Allow the Escape key to close the dialog.
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Work out the price change across the range currently shown, so the
  // colour and the percentage reflect the selected window.
  const rangeChange = useMemo(() => {
    if (!prices || prices.length < 2) return null;
    const first = prices[0][1];
    const last = prices[prices.length - 1][1];
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [prices]);

  const positive = (rangeChange ?? 0) >= 0;
  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? "";

  function submitAlert(event) {
    event.preventDefault();
    const target = Number(alertPrice);
    if (!target || target <= 0) return;
    // The direction is decided by where the target sits relative to the
    // current price, which is what a user almost always intends.
    const direction = target >= coin.current_price ? "above" : "below";
    onAddAlert({
      coinId: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      target,
      direction,
    });
    setAlertSaved(true);
    setAlertPrice("");
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${coin.name} detail`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div className="modal__title">
            <img src={coin.image} alt="" className="coin-logo coin-logo--lg" />
            <div>
              <h2>{coin.name}</h2>
              <span className="muted">{coin.symbol.toUpperCase()}</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close detail view">
            &times;
          </button>
        </header>

        <div className="modal__price-row">
          <span className="modal__price">{formatPrice(coin.current_price, currency)}</span>
          {rangeChange !== null && (
            <span className={`pill ${positive ? "pill--up" : "pill--down"}`}>
              {formatPercent(rangeChange)} <span className="muted">{rangeLabel}</span>
            </span>
          )}
        </div>

        <div className="range-switch" role="group" aria-label="Chart time range">
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
          {status === "loading" && <div className="chart chart--empty">Loading chart...</div>}
          {status === "error" && <div className="chart chart--empty">{errorMessage}</div>}
          {status === "ready" && (
            <PriceChart prices={prices} currency={currency} positive={positive} />
          )}
        </div>

        {sentiment !== null && (
          <div className="sentiment">
            <div className="sentiment__head">
              <span className="overview__label">Community sentiment</span>
              <span className="muted">{sentiment.toFixed(0)}% feel positive</span>
            </div>
            <div className="sentiment__bar" role="img" aria-label={`${sentiment.toFixed(0)} percent positive`}>
              <div className="sentiment__fill" style={{ width: `${sentiment}%` }} />
            </div>
          </div>
        )}

        <dl className="stats">
          <div className="stat">
            <dt>Market cap</dt>
            <dd>{formatCompact(coin.market_cap, currency)}</dd>
          </div>
          <div className="stat">
            <dt>Rank</dt>
            <dd>#{coin.market_cap_rank ?? "N/A"}</dd>
          </div>
          <div className="stat">
            <dt>24h volume</dt>
            <dd>{formatCompact(coin.total_volume, currency)}</dd>
          </div>
          <div className="stat">
            <dt>24h high</dt>
            <dd>{formatPrice(coin.high_24h, currency)}</dd>
          </div>
          <div className="stat">
            <dt>24h low</dt>
            <dd>{formatPrice(coin.low_24h, currency)}</dd>
          </div>
          <div className="stat">
            <dt>All time high</dt>
            <dd>{formatPrice(coin.ath, currency)}</dd>
          </div>
        </dl>

        <form className="alert-form" onSubmit={submitAlert}>
          <label className="overview__label" htmlFor="alert-price">
            Set a price alert
          </label>
          <div className="alert-form__row">
            <input
              id="alert-price"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={alertPrice}
              placeholder={`e.g. ${coin.current_price}`}
              onChange={(event) => {
                setAlertPrice(event.target.value);
                setAlertSaved(false);
              }}
              aria-label={`Target price for ${coin.name}`}
            />
            <button type="submit" className="refresh-button">
              Notify me
            </button>
          </div>
          {alertSaved ? (
            <span className="alert-form__saved change--up">
              Alert saved. You can manage it from the Alerts panel.
            </span>
          ) : (
            <span className="muted alert-form__help">
              We will alert you when the price moves above or below your target,
              whichever side it starts from.
            </span>
          )}
        </form>

        <p className="modal__note muted">
          Data provided by the CoinGecko public API. Community sentiment reflects
          user votes on CoinGecko. Figures are for general information only and are
          not financial advice.
        </p>
      </div>
    </div>
  );
}
