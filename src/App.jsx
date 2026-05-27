import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMarkets } from "./api.js";
import { formatPrice, formatCompact, formatPercent } from "./format.js";
import Sparkline from "./components/Sparkline.jsx";
import CoinDetail from "./components/CoinDetail.jsx";

const CURRENCIES = [
  { code: "usd", label: "USD" },
  { code: "eur", label: "EUR" },
  { code: "gbp", label: "GBP" },
];

const REFRESH_INTERVAL = 60 * 1000;

export default function App() {
  const [coins, setCoins] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("market_cap");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setStatus("loading");
      try {
        const data = await fetchMarkets(currency, 50);
        setCoins(data);
        setLastUpdated(new Date());
        setStatus("ready");
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(error.message);
        setStatus("error");
      }
    },
    [currency]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  // Quietly refresh the data on a timer when auto refresh is enabled.
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => load(false), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  function changeSort(key) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const visibleCoins = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? coins.filter(
          (coin) =>
            coin.name.toLowerCase().includes(term) ||
            coin.symbol.toLowerCase().includes(term)
        )
      : coins;

    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return sorted;
  }, [coins, query, sortKey, sortDir]);

  const sortIndicator = (key) => {
    if (key !== sortKey) return "";
    return sortDir === "desc" ? " ▾" : " ▴";
  };

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="28" height="28">
              <polyline
                points="8,44 22,28 32,36 44,16 56,26"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1>Crypto Pulse</h1>
            <p className="tagline">Live market data for the leading cryptocurrencies.</p>
          </div>
        </div>

        <div className="currency-switch" role="group" aria-label="Display currency">
          {CURRENCIES.map((item) => (
            <button
              key={item.code}
              className={`currency-switch__option ${
                currency === item.code ? "is-active" : ""
              }`}
              onClick={() => setCurrency(item.code)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="controls">
        <div className="search">
          <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or symbol"
            aria-label="Search coins"
          />
        </div>

        <div className="controls__right">
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            <span>Auto refresh</span>
          </label>
          <button className="refresh-button" onClick={() => load(true)}>
            Refresh
          </button>
        </div>
      </section>

      {status === "error" && (
        <div className="notice notice--error">
          <p>{errorMessage}</p>
          <button className="refresh-button" onClick={() => load(true)}>
            Try again
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="table-card">
          <ul className="skeleton-list">
            {Array.from({ length: 8 }).map((_, index) => (
              <li key={index} className="skeleton-row" />
            ))}
          </ul>
        </div>
      )}

      {status === "ready" && (
        <div className="table-card">
          <div className="table-scroll">
            <table className="coin-table">
              <thead>
                <tr>
                  <th className="col-rank">#</th>
                  <th className="col-name">Name</th>
                  <th className="col-num sortable" onClick={() => changeSort("current_price")}>
                    Price{sortIndicator("current_price")}
                  </th>
                  <th
                    className="col-num sortable"
                    onClick={() => changeSort("price_change_percentage_24h_in_currency")}
                  >
                    24h{sortIndicator("price_change_percentage_24h_in_currency")}
                  </th>
                  <th
                    className="col-num sortable hide-sm"
                    onClick={() => changeSort("price_change_percentage_7d_in_currency")}
                  >
                    7d{sortIndicator("price_change_percentage_7d_in_currency")}
                  </th>
                  <th className="col-num sortable hide-sm" onClick={() => changeSort("market_cap")}>
                    Market cap{sortIndicator("market_cap")}
                  </th>
                  <th className="col-spark hide-sm">Trend</th>
                </tr>
              </thead>
              <tbody>
                {visibleCoins.map((coin) => {
                  const change24 = coin.price_change_percentage_24h_in_currency;
                  const change7 = coin.price_change_percentage_7d_in_currency;
                  const spark = coin.sparkline_in_7d ? coin.sparkline_in_7d.price : [];
                  return (
                    <tr
                      key={coin.id}
                      className="coin-row"
                      tabIndex={0}
                      onClick={() => setSelected(coin)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setSelected(coin);
                      }}
                    >
                      <td className="col-rank muted">{coin.market_cap_rank ?? "-"}</td>
                      <td className="col-name">
                        <div className="coin-name">
                          <img src={coin.image} alt="" className="coin-logo" />
                          <span className="coin-name__text">
                            <span className="coin-name__title">{coin.name}</span>
                            <span className="coin-name__symbol muted">
                              {coin.symbol.toUpperCase()}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="col-num">{formatPrice(coin.current_price, currency)}</td>
                      <td className="col-num">
                        <span className={changeClass(change24)}>{formatPercent(change24)}</span>
                      </td>
                      <td className="col-num hide-sm">
                        <span className={changeClass(change7)}>{formatPercent(change7)}</span>
                      </td>
                      <td className="col-num hide-sm">{formatCompact(coin.market_cap, currency)}</td>
                      <td className="col-spark hide-sm">
                        <Sparkline values={spark} positive={(change7 ?? 0) >= 0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleCoins.length === 0 && (
            <div className="empty-state">
              <p>No coins match "{query}".</p>
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <span className="muted">
          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString("en-US")}`
            : "Loading market data"}
        </span>
        <span className="muted">
          Data by CoinGecko. Information only, not financial advice.
        </span>
      </footer>

      {selected && (
        <CoinDetail coin={selected} currency={currency} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function changeClass(value) {
  if (value === null || value === undefined) return "change";
  return value >= 0 ? "change change--up" : "change change--down";
}
