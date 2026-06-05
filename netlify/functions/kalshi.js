// netlify/functions/kalshi.js
// Proxies Kalshi public market data (vig-free binary markets) for use as a fair reference.
//
// AUTH: Per Kalshi's docs, read-only MARKET DATA requires NO authentication — "No
// authentication headers are required" for /markets, orderbook, events, series. Only
// trading/portfolio endpoints need RSA-PSS signed requests. So this proxy needs NO env var.
// (If Kalshi later gates market data behind a key, add it as a process.env var here exactly
//  like ANTHROPIC_API_KEY / ODDS_API_KEY — never hardcode a credential.)
//
// Built defensively: short timeout, try/catch, and a clear JSON error on failure/empty so the
// client can show a message instead of hanging. The client logs the raw shape on first call.

const KALSHI_BASE = "https://external-api.kalshi.com/trade-api/v2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (statusCode, obj) => ({
  statusCode,
  headers: { ...cors, "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed." });

  const qs = event.queryStringParameters || {};

  // Single market: /api/kalshi?market_ticker=XYZ  ->  /markets/XYZ
  // List markets:  /api/kalshi?series_ticker=...&event_ticker=...&tickers=...&status=...&limit=...
  let url;
  if (qs.market_ticker) {
    url = `${KALSHI_BASE}/markets/${encodeURIComponent(qs.market_ticker)}`;
  } else {
    const params = new URLSearchParams();
    ["series_ticker", "event_ticker", "tickers", "status", "limit"].forEach((k) => {
      if (qs[k]) params.set(k, qs[k]);
    });
    if (!params.has("status")) params.set("status", "open");
    if (!params.has("limit")) params.set("limit", "200");
    url = `${KALSHI_BASE}/markets?${params.toString()}`;
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    const text = await upstream.text();
    // Pass Kalshi's status + body straight through (incl. its own error bodies) so the
    // client can inspect the real response shape.
    if (!text) return json(upstream.status || 502, { error: "Kalshi returned an empty response.", status: upstream.status });
    return { statusCode: upstream.status, headers: { ...cors, "Content-Type": "application/json" }, body: text };
  } catch (err) {
    const timeout = err && (err.name === "TimeoutError" || err.name === "AbortError");
    return json(timeout ? 504 : 502, {
      error: timeout ? "Kalshi request timed out." : "Kalshi upstream failed (it may be blocking server requests).",
      detail: String(err && err.message ? err.message : err),
    });
  }
};
