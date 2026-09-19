// Only compare targets with prices quoted in the currency saved on the alert.
// Older alerts did not record a currency, so they must be recreated.
export function isAlertReached(alert, coin, currency) {
  if (alert.triggered || !alert.currency || alert.currency !== currency) return false;
  if (!coin || !Number.isFinite(coin.current_price) || !Number.isFinite(alert.target)) return false;
  if (alert.direction === "above") return coin.current_price >= alert.target;
  if (alert.direction === "below") return coin.current_price <= alert.target;
  return false;
}
