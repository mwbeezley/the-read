# The Read — Setup Instructions for Claude Code

## Repo Structure
```
the-read/
├── index.html                 # The full app (4500+ lines)
├── netlify.toml               # Netlify config + CSP headers
├── netlify/
│   └── functions/
│       └── claude.js          # Anthropic API proxy (server-side)
└── README.md
```

## What Claude Code needs to do

### Step 1: Update index.html to call the proxy instead of Anthropic directly

Find every instance of this fetch call in index.html:
```javascript
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: claudeHeaders(),
  ...
})
```

Replace the URL and headers:
```javascript
fetch('/.netlify/functions/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  ...
})
```

Also remove the `claudeHeaders()` function and the API key input field from the UI — 
the key now lives server-side as a Netlify environment variable.

Remove this function:
```javascript
function claudeHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': claudeKey(),
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
}
```

Remove the API key input field from the HTML header area.

### Step 2: Initialize git repo and push to GitHub
```bash
git init
git add .
git commit -m "Initial commit — The Read v1"
gh repo create the-read --public --source=. --push
```

### Step 3: Connect Netlify to GitHub
- Go to app.netlify.com
- Click "Add new site" → "Import an existing project"
- Select GitHub → select "the-read" repo
- Build settings: leave defaults (netlify.toml handles config)
- Click Deploy

### Step 4: Set the API key as a Netlify environment variable
- In Netlify: Site configuration → Environment variables
- Add variable: `ANTHROPIC_API_KEY` = your Anthropic API key
- Redeploy

### Step 5: Verify
- Visit your Netlify URL
- Open Scout, enter a game, hit Scout
- Should work immediately with no timeout

## Why this fixes everything
- **No CORS/CSP blocks** — API calls go to your own Netlify function, same domain
- **API key never exposed** — lives in Netlify env vars, not in browser
- **Voice-to-text works** — HTTPS on a real domain
- **Auto-deploy** — push to GitHub → live in 30 seconds
- **120s server-side timeout** — no more hanging forever
- **No re-entering API key** — it's baked into the deployment

## ESPN API
The ESPN calls in index.html stay as-is — they're public, no key needed,
and don't need proxying. Only the Anthropic calls go through the function.
