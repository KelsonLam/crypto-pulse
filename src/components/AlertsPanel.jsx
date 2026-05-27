import { formatPrice } from "../format.js";

// A slide-in panel listing the user's price alerts, with the ability to
// remove them. Alerts themselves are created from a coin's detail view.

export default function AlertsPanel({ alerts, currency, onRemove, onClear, onClose }) {
  const notificationsAllowed =
    typeof Notification !== "undefined" && Notification.permission === "granted";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Price alerts"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Price alerts</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close alerts">
            &times;
          </button>
        </header>

        {!notificationsAllowed && (
          <p className="muted alerts__hint">
            Allow browser notifications to be told the moment an alert is reached.
            Until then, alerts still appear as a banner inside the page.
          </p>
        )}

        {alerts.length === 0 ? (
          <div className="portfolio__empty">
            <p className="muted">
              You have no alerts yet. Open any coin and use "Set a price alert" to
              be notified when it reaches a price you choose.
            </p>
          </div>
        ) : (
          <>
            <ul className="alerts__list">
              {alerts.map((alert) => (
                <li key={alert.id} className="alerts__row">
                  <div className="alerts__info">
                    <span className="coin-name__title">{alert.symbol}</span>
                    <span className="muted">
                      when price is {alert.direction} {formatPrice(alert.target, currency)}
                    </span>
                  </div>
                  <span className={`alerts__state ${alert.triggered ? "is-done" : ""}`}>
                    {alert.triggered ? "Triggered" : "Active"}
                  </span>
                  <button
                    className="portfolio__remove"
                    onClick={() => onRemove(alert.id)}
                    aria-label={`Remove alert for ${alert.symbol}`}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
            <button className="refresh-button alerts__clear" onClick={onClear}>
              Clear all alerts
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
