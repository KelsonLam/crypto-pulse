// A small wrapper around the CoinGecko public API.
// No API key is required for these endpoints, which keeps the project
// easy to run for anyone who clones the repository.

const BASE_URL = "https://api.coingecko.com/api/v3";

// A friendly error that the interface can display to the user.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: "application/json" },
    });
  } catch (networkError) {
    throw new ApiError(
      "We could not reach the market data service. Please check your connection and try again.",
      0
    );
  }

  if (response.status === 429) {
    throw new ApiError(
      "The free data service is busy right now (rate limit reached). Please wait a moment and refresh.",
      429
    );
  }

  if (!response.ok) {
    throw new ApiError(
      "Something went wrong while loading market data. Please try again shortly.",
      response.status
    );
  }

  return response.json();
}

// Fetch the top coins by market capitalisation, including the seven day
// sparkline values and the price change for the chosen periods.
export function fetchMarkets(currency, perPage = 50) {
  const params = new URLSearchParams({
    vs_currency: currency,
    order: "market_cap_desc",
    per_page: String(perPage),
    page: "1",
    sparkline: "true",
    price_change_percentage: "24h,7d",
  });
  return request(`/coins/markets?${params.toString()}`);
}

// Fetch a price history for a single coin over a number of days.
// The response shape is { prices: [[timestamp, value], ...], ... }.
export async function fetchMarketChart(coinId, currency, days = 7) {
  const params = new URLSearchParams({
    vs_currency: currency,
    days: String(days),
  });
  const data = await request(
    `/coins/${coinId}/market_chart?${params.toString()}`
  );
  return Array.isArray(data.prices) ? data.prices : [];
}
