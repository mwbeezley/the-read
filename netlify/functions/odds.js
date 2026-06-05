// netlify/functions/odds.js
// Proxies The Odds API (game lines only) using a server-side ODDS_API_KEY.
// Free tier = GAME LINES ONLY (h2h, spreads, totals). Player props require the paid
// tier and would error, so the markets list is locked server-side on purpose.

const ODDS_BASE = "https://api.the-odds-api.com/v4";
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

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return json(500, { error: "Server missing ODDS_API_KEY. Add it in Netlify env vars and redeploy." });

  const qs = event.queryStringParameters || {};
  const sport = (qs.sport || "").trim();
  if (!sport) return json(400, { error: "Need ?sport= (e.g. americanfootball_nfl)." });

  // Locked to game lines — free tier. Do NOT pass player-prop markets here.
  const params = new URLSearchParams({
    apiKey,
    regions: "us",
    markets: "h2h,spreads,totals",
    oddsFormat: "american",
  });
  const url = `${ODDS_BASE}/sports/${encodeURIComponent(sport)}/odds/?${params.toString()}`;

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const text = await upstream.text();
    return { statusCode: upstream.status, headers: { ...cors, "Content-Type": "application/json" }, body: text };
  } catch (err) {
    const timeout = err && (err.name === "TimeoutError" || err.name === "AbortError");
    return json(timeout ? 504 : 502, {
      error: timeout ? "Odds API request timed out." : "Odds API upstream failed.",
      detail: String(err && err.message ? err.message : err),
    });
  }
};
