import { useMemo, useState } from "react";
import { formatPrice, formatCompact } from "../format.js";

// A slide-in panel where the user records how much of each coin they hold.
// The total value is calculated live from the current prices already loaded
// in the main table. Holdings are passed in and persisted by the parent.

export default function Portfolio({ coins, currency, holdings, setHoldings, onClose }) {
  const [picker, setPicker] = useState("");

  // Build the list of held coins by joining the saved amounts with the
  // live market data, so we always show the latest price and value.
  const rows = useMemo(() => {
    return Object.keys(holdings)
      .map((id) => {
        const coin = coins.find((c) => c.id === id);
        if (!coin) return null;
        const amount = Number(holdings[id]) || 0;
        return { coin, amount, value: amount * coin.current_price };
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value);
  }, [holdings, coins]);

  const total = rows.reduce((sum, row) => sum + row.value, 0);

  function updateAmount(id, raw) {
    const next = { ...holdings };
    if (raw === "" || Number(raw) <= 0) {
      delete next[id];
    } else {
      next[id] = raw;
    }
    setHoldings(next);
  }

  function addCoin(id) {
    if (!id || holdings[id] !== undefined) return;
    setHoldings({ ...holdings, [id]: "" });
    setPicker("");
  }

  const available = coins.filter((c) => holdings[c.id] === undefined);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your portfolio"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Your portfolio</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close portfolio">
            &times;
          </button>
        </header>

        <div className="portfolio__total">
          <span className="overview__label">Total value</span>
          <span className="portfolio__total-value">{formatPrice(total, currency)}</span>
        </div>

        <div className="portfolio__add">
          <select
            value={picker}
            onChange={(event) => addCoin(event.target.value)}
            aria-label="Add a coin to your portfolio"
          >
            <option value="">Add a coin...</option>
            {available.map((coin) => (
              <option key={coin.id} value={coin.id}>
                {coin.name} ({coin.symbol.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <div className="portfolio__empty">
            <p className="muted">
              Your portfolio is empty. Add a coin above, then enter how much you
              hold to see its live value. Nothing you type leaves your browser.
            </p>
          </div>
        ) : (
          <ul className="portfolio__list">
            {rows.map(({ coin, amount, value }) => (
              <li key={coin.id} className="portfolio__row">
                <img src={coin.image} alt="" className="coin-logo" />
                <div className="portfolio__coin">
                  <span className="coin-name__title">{coin.symbol.toUpperCase()}</span>
                  <span className="muted">{formatPrice(coin.current_price, currency)}</span>
                </div>
                <input
                  className="portfolio__amount"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={amount === 0 ? holdings[coin.id] : amount}
                  placeholder="0"
                  onChange={(event) => updateAmount(coin.id, event.target.value)}
                  aria-label={`Amount of ${coin.name} held`}
                />
                <span className="portfolio__value">{formatCompact(value, currency)}</span>
                <button
                  className="portfolio__remove"
                  onClick={() => updateAmount(coin.id, "")}
                  aria-label={`Remove ${coin.name}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="modal__note muted">
          Values use live prices from CoinGecko and are for general information
          only. This is not financial advice.
        </p>
      </aside>
    </div>
  );
}
