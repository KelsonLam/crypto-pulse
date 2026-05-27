import { useEffect, useState } from "react";
import PriceChart from "./PriceChart.jsx";
import { fetchMarketChart } from "../api.js";
import { formatPrice, formatCompact, formatPercent } from "../format.js";

// A modal dialog that shows a single coin in detail, including a seven day
// price chart loaded on demand and a set of key statistics.

export default function CoinDetail({ coin, currency, onClose }) {
  const [prices, setPrices] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetchMarketChart(coin.id, currency, 7)
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
  }, [coin.id, currency]);

  // Allow the Escape key to close the dialog.
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const change7d = coin.price_change_percentage_7d_in_currency;
  const positive = (change7d ?? 0) >= 0;

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
          <span className={`pill ${positive ? "pill--up" : "pill--down"}`}>
            {formatPercent(change7d)} <span className="muted">7d</span>
          </span>
        </div>

        <div className="modal__chart">
          {status === "loading" && <div className="chart chart--empty">Loading chart...</div>}
          {status === "error" && <div className="chart chart--empty">{errorMessage}</div>}
          {status === "ready" && (
            <PriceChart prices={prices} currency={currency} positive={positive} />
          )}
        </div>

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

        <p className="modal__note muted">
          Data provided by the CoinGecko public API. Figures are for general
          information only and are not financial advice.
        </p>
      </div>
    </div>
  );
}
