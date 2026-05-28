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

// Fetch global market figures such as the total market capitalisation,
// total trading volume, and Bitcoin's share of the market.
export async function fetchGlobal() {
  const data = await request("/global");
  return data && data.data ? data.data : null;
}

// Fetch the coins that are trending in search over the past day.
// The response nests each coin under an "item" key.
export async function fetchTrending() {
  const data = await request("/search/trending");
  const coins = Array.isArray(data.coins) ? data.coins : [];
  return coins.map((entry) => entry.item).filter(Boolean);
}

// Fetch fuller information for a single coin, used to show the
// community sentiment figures in the detail view. This is a heavier
// response, so it is only requested when a coin is opened.
export async function fetchCoinInfo(coinId) {
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "false",
    community_data: "false",
    developer_data: "false",
    sparkline: "false",
  });
  return request(`/coins/${coinId}?${params.toString()}`);
}

// Fetch the Fear and Greed index from Alternative.me. This is a separate,
// keyless service, so it uses its own URL rather than the CoinGecko base.
// It returns a value from 0 to 100 with a short classification.
export async function fetchFearGreed() {
  let response;
  try {
    response = await fetch("https://api.alternative.me/fng/?limit=1");
  } catch (networkError) {
    throw new ApiError("Could not reach the Fear and Greed service.", 0);
  }
  if (!response.ok) {
    throw new ApiError("Could not load the Fear and Greed index.", response.status);
  }
  const data = await response.json();
  const entry = Array.isArray(data.data) ? data.data[0] : null;
  if (!entry) return null;
  return {
    value: Number(entry.value),
    label: entry.value_classification,
  };
}

// Fetch recent cryptocurrency news headlines from CryptoCompare. This is a
// separate, keyless service, so it has its own URL. We return only the few
// fields the ticker needs: a title, a link, and the source name.
export async function fetchNews(limit = 14) {
  let response;
  try {
    response = await fetch("https://min-api.cryptocompare.com/data/v2/news/?lang=EN");
  } catch (networkError) {
    throw new ApiError("Could not reach the news service.", 0);
  }
  if (!response.ok) {
    throw new ApiError("Could not load the news feed.", response.status);
  }
  const data = await response.json();
  const items = Array.isArray(data.Data) ? data.Data : [];
  return items.slice(0, limit).map((article) => ({
    id: article.id,
    title: article.title,
    url: article.url,
    source: (article.source_info && article.source_info.name) || article.source || "",
  }));
}
