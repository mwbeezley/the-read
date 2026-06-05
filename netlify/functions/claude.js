const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed." }) };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return { statusCode: 500, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Server missing ANTHROPIC_API_KEY. Add it in Netlify env vars and redeploy." }) };
  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid JSON." }) }; }
  if (!payload.model || !Array.isArray(payload.messages))
    return { statusCode: 400, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Need model + messages." }) };
  const headers = { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION };
  if (payload.anthropicBeta) { headers["anthropic-beta"] = payload.anthropicBeta; delete payload.anthropicBeta; }
  try {
    const upstream = await fetch(ANTHROPIC_URL, { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await upstream.text();
    return { statusCode: upstream.status, headers: { ...cors, "Content-Type": "application/json" }, body: text };
  } catch (err) {
    return { statusCode: 502, headers: { ...cors, "Content-Type": "application/json" }, body: JSON.stringify({ error: "Upstream failed.", detail: String(err && err.message ? err.message : err) }) };
  }
};
