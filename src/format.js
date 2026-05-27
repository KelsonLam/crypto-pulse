// Formatting helpers shared across the application.

const SYMBOLS = { usd: "$", eur: "€", gbp: "£" };

export function currencySymbol(currency) {
  return SYMBOLS[currency] || "";
}

// Format a price with a sensible number of decimals. Very small prices
// keep more digits so they remain readable.
export function formatPrice(value, currency) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }
  const symbol = currencySymbol(currency);
  let decimals = 2;
  if (value < 1) decimals = 6;
  if (value < 0.01) decimals = 8;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals === 2 ? 2 : 0,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
}

// Format a large number such as a market capitalisation into a compact form.
export function formatCompact(value, currency) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }
  const symbol = currencySymbol(currency);
  const compact = value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  });
  return `${symbol}${compact}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
