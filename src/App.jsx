import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMarkets } from "./api.js";
import { formatPrice, formatCompact, formatPercent } from "./format.js";
import { useLocalStorage } from "./useLocalStorage.js";
import Sparkline from "./components/Sparkline.jsx";
import CoinDetail from "./components/CoinDetail.jsx";
import MarketOverview from "./components/MarketOverview.jsx";
import Portfolio from "./components/Portfolio.jsx";
import Compare from "./components/Compare.jsx";
import AlertsPanel from "./components/AlertsPanel.jsx";
import NewsTicker from "./components/NewsTicker.jsx";

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
  const [view, setView] = useState("all");
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [toast, setToast] = useState(null);

  // Persisted state.
  const [watchlist, setWatchlist] = useLocalStorage("cp_watchlist", []);
  const [holdings, setHoldings] = useLocalStorage("cp_holdings", {});
  const [alerts, setAlerts] = useLocalStorage("cp_alerts", []);
  const [theme, setTheme] = useLocalStorage("cp_theme", "dark");

  // Keep the document's theme attribute in step with the saved preference.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => load(false), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  // A reference to the latest alerts, so the price check can run on a change
  // to the coin data without re-subscribing every time an alert changes.
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  // Whenever fresh prices arrive, see if any active alert has been reached.
  useEffect(() => {
    if (!coins.length) return;
    const current = alertsRef.current;
    if (!current.length) return;

    const fired = [];
    const next = current.map((alert) => {
      if (alert.triggered) return alert;
      const coin = coins.find((c) => c.id === alert.coinId);
      if (!coin || typeof coin.current_price !== "number") return alert;
      const reached =
        alert.direction === "above"
          ? coin.current_price >= alert.target
          : coin.current_price <= alert.target;
      if (reached) {
        fired.push({ ...alert, price: coin.current_price });
        return { ...alert, triggered: true };
      }
      return alert;
    });

    if (fired.length > 0) {
      setAlerts(next);
      fired.forEach(sendNotification);
      const first = fired[0];
      setToast(
        `${first.name} is now ${first.direction} ${formatPrice(first.target, currency)}.`
      );
    }
  }, [coins, currency, setAlerts]);

  // Clear the banner a few seconds after it appears.
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(id);
  }, [toast]);

  function changeSort(key) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleWatch(id) {
    setWatchlist((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function handleTrending(coin) {
    const match = coins.find((c) => c.id === coin.id);
    if (match) {
      setSelected(match);
    } else {
      setView("all");
      setQuery(coin.symbol);
    }
  }

  function addAlert(partial) {
    // Ask for notification permission the first time an alert is created.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const alert = {
      ...partial,
      id: `${partial.coinId}-${Date.now()}`,
      triggered: false,
      createdAt: Date.now(),
    };
    setAlerts((current) => [...current, alert]);
  }

  function removeAlert(id) {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }

  const visibleCoins = useMemo(() => {
    const term = query.trim().toLowerCase();
    let filtered = term
      ? coins.filter(
          (coin) =>
            coin.name.toLowerCase().includes(term) ||
            coin.symbol.toLowerCase().includes(term)
        )
      : coins;

    if (view === "watchlist") {
      filtered = filtered.filter((coin) => watchlist.includes(coin.id));
    }

    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return sorted;
  }, [coins, query, sortKey, sortDir, view, watchlist]);

  const sortIndicator = (key) => {
    if (key !== sortKey) return "";
    return sortDir === "desc" ? " ▾" : " ▴";
  };

  const portfolioCount = Object.keys(holdings).length;
  const activeAlerts = alerts.filter((alert) => !alert.triggered).length;

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true" />

      {toast && (
        <div className="toast" role="status">
          <span className="toast__dot" aria-hidden="true" />
          {toast}
          <button className="toast__close" onClick={() => setToast(null)} aria-label="Dismiss">
            &times;
          </button>
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="28" height="28">
              <polyline points="8,44 22,28 32,36 44,16 56,26" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1>Crypto Pulse</h1>
            <p className="tagline">Live market data for the leading cryptocurrencies.</p>
          </div>
        </div>

        <div className="topbar__actions">
          <button
            className="icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title="Toggle theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button className="portfolio-button" onClick={() => setShowAlerts(true)}>
            Alerts
            {activeAlerts > 0 && <span className="badge">{activeAlerts}</span>}
          </button>
          <button className="portfolio-button" onClick={() => setShowPortfolio(true)}>
            Portfolio
            {portfolioCount > 0 && <span className="badge">{portfolioCount}</span>}
          </button>
          <div className="currency-switch" role="group" aria-label="Display currency">
            {CURRENCIES.map((item) => (
              <button
                key={item.code}
                className={`currency-switch__option ${currency === item.code ? "is-active" : ""}`}
                onClick={() => setCurrency(item.code)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <NewsTicker />

      <MarketOverview currency={currency} onSelectTrending={handleTrending} />

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
          <button className="refresh-button" onClick={() => setShowCompare(true)}>
            Compare
          </button>
          <div className="view-switch" role="group" aria-label="Table view">
            <button
              className={`view-switch__option ${view === "all" ? "is-active" : ""}`}
              onClick={() => setView("all")}
            >
              All
            </button>
            <button
              className={`view-switch__option ${view === "watchlist" ? "is-active" : ""}`}
              onClick={() => setView("watchlist")}
            >
              Watchlist
              {watchlist.length > 0 && <span className="badge badge--soft">{watchlist.length}</span>}
            </button>
          </div>
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
                  <th className="col-star" aria-label="Watchlist"></th>
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
                  const starred = watchlist.includes(coin.id);
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
                      <td className="col-star">
                        <button
                          className={`star ${starred ? "is-on" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleWatch(coin.id);
                          }}
                          aria-label={starred ? `Remove ${coin.name} from watchlist` : `Add ${coin.name} to watchlist`}
                          aria-pressed={starred}
                        >
                          {starred ? "★" : "☆"}
                        </button>
                      </td>
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
              {view === "watchlist" && watchlist.length === 0 ? (
                <p>Your watchlist is empty. Tap the star next to any coin to follow it here.</p>
              ) : (
                <p>No coins match "{query}".</p>
              )}
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
        <span className="muted">Data by CoinGecko. Information only, not financial advice.</span>
      </footer>

      {selected && (
        <CoinDetail
          coin={selected}
          currency={currency}
          onClose={() => setSelected(null)}
          onAddAlert={addAlert}
        />
      )}

      {showPortfolio && (
        <Portfolio
          coins={coins}
          currency={currency}
          holdings={holdings}
          setHoldings={setHoldings}
          onClose={() => setShowPortfolio(false)}
        />
      )}

      {showCompare && <Compare coins={coins} onClose={() => setShowCompare(false)} />}

      {showAlerts && (
        <AlertsPanel
          alerts={alerts}
          currency={currency}
          onRemove={removeAlert}
          onClear={() => setAlerts([])}
          onClose={() => setShowAlerts(false)}
        />
      )}
    </div>
  );
}

function sendNotification(alert) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification("Crypto Pulse alert", {
      body: `${alert.name} (${alert.symbol}) is now ${alert.direction} your target.`,
    });
  } catch (error) {
    // Some browsers restrict notifications; the in-app banner still shows.
  }
}

function changeClass(value) {
  if (value === null || value === undefined) return "change";
  return value >= 0 ? "change change--up" : "change change--down";
}
