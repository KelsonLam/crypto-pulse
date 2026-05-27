import { useEffect, useState } from "react";
import { fetchGlobal, fetchTrending } from "../api.js";
import { formatCompact, formatPercent } from "../format.js";
import FearGreed from "./FearGreed.jsx";

// A header strip that summarises the whole market: total capitalisation,
// total trading volume, Bitcoin's dominance, and the coins trending today.

export default function MarketOverview({ currency, onSelectTrending }) {
  const [global, setGlobal] = useState(null);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    let active = true;
    // Both calls are allowed to fail quietly. The overview is a nicety,
    // so it should never block the main table from appearing.
    fetchGlobal()
      .then((data) => active && setGlobal(data))
      .catch(() => {});
    fetchTrending()
      .then((data) => active && setTrending(data.slice(0, 5)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currency]);

  const totalCap = global?.total_market_cap?.[currency];
  const totalVol = global?.total_volume?.[currency];
  const btcDominance = global?.market_cap_percentage?.btc;
  const capChange = global?.market_cap_change_percentage_24h_usd;

  return (
    <section className="overview" aria-label="Market overview">
      <div className="overview__stats">
        <div className="overview__stat">
          <span className="overview__label">Total market cap</span>
          <span className="overview__value">{formatCompact(totalCap, currency)}</span>
          {capChange !== undefined && (
            <span className={capChange >= 0 ? "change--up" : "change--down"}>
              {formatPercent(capChange)} 24h
            </span>
          )}
        </div>
        <div className="overview__stat">
          <span className="overview__label">24h volume</span>
          <span className="overview__value">{formatCompact(totalVol, currency)}</span>
        </div>
        <div className="overview__stat">
          <span className="overview__label">BTC dominance</span>
          <span className="overview__value">
            {btcDominance !== undefined ? `${btcDominance.toFixed(1)}%` : "N/A"}
          </span>
        </div>
      </div>

      <FearGreed />

      {trending.length > 0 && (
        <div className="overview__trending">
          <span className="overview__label">Trending</span>
          <div className="trending-chips">
            {trending.map((coin) => (
              <button
                key={coin.id}
                className="trending-chip"
                onClick={() => onSelectTrending(coin)}
                title={`View ${coin.name}`}
              >
                <img src={coin.thumb} alt="" />
                <span>{coin.symbol.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
