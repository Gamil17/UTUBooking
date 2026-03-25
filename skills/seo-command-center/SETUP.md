# SEO Command Center — MCP Setup SOP
**Skill:** seo-command-center (Video #20)
**Purpose:** Connect GA4 + GSC + DataForSEO so Claude can pull live traffic, rankings, and keyword data
**Time to complete:** ~45 minutes (one-time setup)

---

## Prerequisites

- Claude Code installed and running
- Python 3.11+ installed — this project uses `C:\Python314\python.exe`
- Node.js 18+ installed (`node --version`)
- pipx installed (`pipx --version` — if missing: `pip install pipx`)
- Google account with GA4 + Search Console access for utubooking.com
- DataForSEO account (free trial available at dataforseo.com)

---

## What's already done

The mcp-gsc repo has been cloned and the venv is ready:

```
skills/seo-command-center/mcp-gsc/          ← cloned from AminForou/mcp-gsc
  gsc_server.py                              ← MCP server script
  venv/Scripts/python.exe                    ← Python 3.14 venv (ready)
  client_secrets.json                        ← YOU MUST ADD THIS (see Step 3)
  token.json                                 ← auto-created on first auth
```

`.mcp.json` is already wired with the full absolute paths.
`.claude/settings.local.json` already grants `mcp__gsc__*` permissions.

---

## STEP 1 — Copy environment file

```bash
cp .env.mcp.example .env.mcp
```

Open `.env.mcp` and fill in values as you complete each step below.

---

## STEP 2 — Install Google Analytics 4 MCP

### 2a. Install the MCP server binary

```bash
pipx install analytics-mcp
```

Verify:
```bash
~/.local/bin/analytics-mcp --version
# Windows: C:\Users\gamil\.local\bin\analytics-mcp.exe --version
```

> **Windows note:** After `pipx install`, update `.mcp.json` → `analytics.command` to the
> full Windows path. Run `where analytics-mcp` to find it.

### 2b. Create a Google Cloud service account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Analytics Data API**: APIs & Services → Enable APIs → search → Enable
4. Create service account: IAM & Admin → Service Accounts → Create
   - Name: `utubooking-mcp` | Role: Viewer
5. Keys tab → Add Key → Create New Key → JSON → Download
6. Save to: `~/.config/analytics-mcp/credentials.json`

### 2c. Grant service account GA4 access

GA4 → Admin → Account Access Management → Add User
- Email: the service account `@...iam.gserviceaccount.com` address
- Role: **Viewer**

### 2d. Get GA4 Property ID

GA4 → Admin → Property → Property Details → copy numeric **Property ID**

Add to `.env.mcp`:
```
GA4_PROPERTY_ID=123456789
```

---

## STEP 3 — Set up Google Search Console MCP

The mcp-gsc repo is already cloned at `skills/seo-command-center/mcp-gsc/`.
The Python venv is ready at `...mcp-gsc/venv/`.

You only need to add your OAuth credentials JSON file.

### 3a. Google Cloud setup for Search Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) — same project as Step 2
2. Enable **Search Console API**: APIs & Services → Enable APIs → "Search Console API" → Enable
3. Add scope: APIs & Services → OAuth consent screen → Scopes → Add `https://www.googleapis.com/auth/webmasters`
4. Create OAuth credentials: Credentials → Create Credentials → OAuth client ID
   - Configure consent screen if prompted (External, add your email as test user)
   - Application type: **Desktop app**
   - Name: `UTUBooking GSC MCP`
5. Click **Download JSON** — save as `client_secrets.json`
6. Move `client_secrets.json` into the mcp-gsc folder:
   ```
   skills/seo-command-center/mcp-gsc/client_secrets.json
   ```

### 3b. First run — OAuth browser flow

The first time Claude uses the GSC MCP, it will open a browser window to authorize.
You'll sign in with the Google account that has Search Console access for utubooking.com.

After authorization, `token.json` is saved automatically — future runs use it silently.

> Both `client_secrets.json` and `token.json` are in `.gitignore` — they will NOT be committed.

### 3c. Paths already wired in `.mcp.json`

```json
"gsc": {
  "command": "D:\\...\\mcp-gsc\\venv\\Scripts\\python.exe",
  "args":    ["D:\\...\\mcp-gsc\\gsc_server.py"],
  "env": {
    "GSC_OAUTH_CLIENT_SECRETS_FILE": "D:\\...\\mcp-gsc\\client_secrets.json",
    "GSC_DATA_STATE": "all"
  }
}
```

No edits needed — just drop in `client_secrets.json`.

---

## STEP 4 — Configure DataForSEO MCP

### 4a. Get DataForSEO credentials

1. Sign up at [dataforseo.com](https://dataforseo.com) (free trial: 1,000 API units)
2. Dashboard → API Credentials → copy **Login (email)** and **API Password**

### 4b. Add to `.env.mcp`

```
DATAFORSEO_LOGIN=your@email.com
DATAFORSEO_PASSWORD=your_api_password
```

The DataForSEO MCP runs via npx (`dataforseo-mcp-server`) — no local install needed.

---

## STEP 5 — Verify all MCP servers are connected

Restart Claude Code after any changes to `.mcp.json`, then run:

```
claude mcp list
```

You should see: `analytics`, `gsc`, `dataforseo`, `notion`, `slack`, `gdrive`, `github`

### Verification prompts (run one at a time)

**GA4:**
```
Using the analytics MCP, show me the top 5 pages by sessions for utubooking.com
in the last 30 days.
```
Expected: Table of pages with session counts.

**GSC:**
```
Using the GSC MCP, list all my Search Console properties.
```
Expected: List including `https://utubooking.com` (first run opens browser for OAuth).

**DataForSEO:**
```
Using the DataForSEO MCP, get keyword volume for "hotels near masjid al haram"
in Saudi Arabia.
```
Expected: Search volume, CPC, competition score.

---

## STEP 6 — Run your first SEO Command Center report

```
Use the seo-command-center skill to generate this week's SEO performance report
for UTUBooking.com.
```

The skill will:
1. Pull GA4 traffic (top pages, sources, trends)
2. Pull GSC rankings (position changes, new keywords, CTR issues)
3. Pull DataForSEO competitor data
4. Generate the full weekly report
5. Save to `marketing/seo/reports/YYYY-MM-DD-weekly-report.md`

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `analytics-mcp: command not found` | pipx path not in shell | Run `pipx ensurepath` and restart terminal |
| GA4 returns no data | Wrong Property ID | GA4 → Admin → Property Settings |
| GSC not connecting | `client_secrets.json` missing | Copy file to `mcp-gsc/` folder |
| GSC auth error | Token expired | Delete `mcp-gsc/token.json` and retry — browser re-opens |
| DataForSEO 401 | Wrong credentials | API Password ≠ account password; check Dashboard |
| MCP not showing in Claude | Config not loaded | Run `claude mcp list`; restart Claude Code |
| `${HOME}` not resolving on Windows | Windows env var | Replace with `C:/Users/gamil` in `.mcp.json` |

---

## MCP connection reference

| MCP | Type | Requires |
|---|---|---|
| GA4 (`analytics`) | pipx binary | Google service account JSON + GA4 Viewer access |
| GSC (`gsc`) | Python venv script | OAuth `client_secrets.json` in mcp-gsc folder |
| DataForSEO (`dataforseo`) | npx | API login + password in `.env.mcp` |
| Notion | npx | `NOTION_API_KEY` in `.env.mcp` |
| Slack | npx | `SLACK_BOT_TOKEN` + `SLACK_TEAM_ID` in `.env.mcp` |
| Google Drive | npx | OAuth tokens in `.env.mcp` |
| GitHub | npx | `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env.mcp` |
