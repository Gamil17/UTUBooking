# SEO Command Center — MCP Setup SOP
**Skill:** seo-command-center (Video #20)
**Purpose:** Connect GA4 + GSC + DataForSEO so Claude can pull live traffic, rankings, and keyword data
**Time to complete:** ~45 minutes (one-time setup)

---

## Prerequisites

- Claude Code installed and running
- Python 3.10+ installed (`python3 --version`)
- Node.js 18+ installed (`node --version`)
- pipx installed (`pipx --version` — if missing: `pip install pipx`)
- Google account with GA4 + Search Console access for utubooking.com
- DataForSEO account (free trial available at dataforseo.com)

---

## STEP 1 — Copy environment file

```bash
cp .env.mcp.example .env.mcp
```

Open `.env.mcp` and fill in all values as you complete each step below.

---

## STEP 2 — Install Google Analytics 4 MCP

### 2a. Install the MCP server binary

```bash
pipx install analytics-mcp
```

Verify install:
```bash
~/.local/bin/analytics-mcp --version
```

### 2b. Create a Google Cloud service account

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Analytics Data API**:
   ```
   APIs & Services → Enable APIs → search "Google Analytics Data API" → Enable
   ```
4. Create a service account:
   ```
   IAM & Admin → Service Accounts → Create Service Account
   Name: utubooking-mcp
   Role: Viewer
   ```
5. Download JSON key:
   ```
   Service Account → Keys → Add Key → Create New Key → JSON → Download
   ```
6. Save key file to: `~/.config/analytics-mcp/credentials.json`
   ```bash
   mkdir -p ~/.config/analytics-mcp
   mv ~/Downloads/utubooking-mcp-*.json ~/.config/analytics-mcp/credentials.json
   ```

### 2c. Grant service account GA4 access

1. Go to [analytics.google.com](https://analytics.google.com)
2. Admin → Account Access Management → Add User
3. Email: the service account email (ends in `@...iam.gserviceaccount.com`)
4. Role: **Viewer**

### 2d. Get your GA4 Property ID

1. GA4 → Admin → Property → Property Details
2. Copy the **Property ID** (numeric, e.g. `123456789`)
3. Add to `.env.mcp`:
   ```
   GA4_PROPERTY_ID=123456789
   ```

---

## STEP 3 — Install Google Search Console MCP

### 3a. Install the Python MCP server

```bash
pip install mcp-server-gsc
```

Verify:
```bash
python3 -m mcp_server_gsc --help
```

### 3b. Create OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Same project as Step 2
3. Enable **Google Search Console API**:
   ```
   APIs & Services → Enable APIs → search "Search Console API" → Enable
   ```
4. Create OAuth 2.0 credentials:
   ```
   APIs & Services → Credentials → Create Credentials → OAuth Client ID
   Application type: Desktop app
   Name: UTUBooking GSC MCP
   ```
5. Download the client secret JSON
6. Run the auth flow to get a refresh token:
   ```bash
   python3 -m mcp_server_gsc --authenticate --client-secret ~/Downloads/client_secret_*.json
   ```
   This opens a browser. Authorize with the Google account that has GSC access.
   Copy the **refresh token** printed to terminal.

### 3c. Add to `.env.mcp`

```
GSC_CLIENT_ID=<from client secret JSON>
GSC_CLIENT_SECRET=<from client secret JSON>
GSC_REFRESH_TOKEN=<from auth flow above>
GSC_SITE_URL=https://utubooking.com
```

---

## STEP 4 — Configure DataForSEO MCP

### 4a. Get DataForSEO credentials

1. Sign up at [dataforseo.com](https://dataforseo.com) (free trial: 1,000 API units)
2. Dashboard → API Access → copy **Login** and **Password**

### 4b. Add to `.env.mcp`

```
DATAFORSEO_LOGIN=your@email.com
DATAFORSEO_PASSWORD=your_api_password
```

The MCP server runs via npx — no install needed. Claude will run it on demand.

---

## STEP 5 — Verify all 3 MCPs are connected

Restart Claude Code, then run these verification prompts one at a time:

### GA4 check
```
Using the analytics MCP, show me the top 5 pages by sessions for utubooking.com in the last 30 days.
```
Expected: A table of pages with session counts.

### GSC check
```
Using the GSC MCP, show me the top 10 keywords by impressions for utubooking.com in the last 28 days.
```
Expected: A table of queries with impressions, clicks, CTR, position.

### DataForSEO check
```
Using the DataForSEO MCP, get keyword volume for "hotels near masjid al haram" in Saudi Arabia.
```
Expected: Search volume, CPC, competition score.

---

## STEP 6 — Run your first SEO Command Center report

Once all 3 MCPs verify, run:

```
Use the seo-command-center skill to generate this week's SEO performance report for UTUBooking.com.
```

The skill will:
1. Pull GA4 traffic (top pages, sources, trends)
2. Pull GSC rankings (position changes, new keywords, CTR issues)
3. Pull DataForSEO competitor data
4. Generate the full weekly report
5. Optionally save to `marketing/seo/reports/YYYY-MM-DD-weekly-report.md`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `analytics-mcp: command not found` | Run `pipx ensurepath` and restart terminal |
| GA4 returns no data | Check service account has Viewer role in GA4 Admin |
| GSC auth fails | Re-run `--authenticate` flow; check refresh token is not expired |
| DataForSEO 401 error | Check login/password in `.env.mcp` — password ≠ account password, it's API password |
| MCP server not found in Claude | Restart Claude Code after editing `.mcp.json` |
| `${HOME}` not resolving on Windows | Replace with absolute path e.g. `C:/Users/yourname/.local/bin/analytics-mcp` |

---

## Windows-specific note

If running on Windows, update `.mcp.json` to use the full path for analytics-mcp:

```json
"command": "C:/Users/YOUR_USERNAME/.local/bin/analytics-mcp"
```

Find the path with:
```bash
where analytics-mcp
```

---

## MCP connection status reference

| MCP | Server | Status Check |
|---|---|---|
| GA4 | `~/.local/bin/analytics-mcp` | Ask: "Show GA4 sessions last 7 days" |
| GSC | `python3 -m mcp_server_gsc` | Ask: "Show GSC top queries last 28 days" |
| DataForSEO | `npx @dataforseo/mcp-server` | Ask: "Get volume for [keyword]" |
| Notion | `npx @notionhq/notion-mcp-server` | Ask: "List my Notion databases" |
| Slack | `npx @modelcontextprotocol/server-slack` | Ask: "List my Slack channels" |
| Google Drive | `npx @modelcontextprotocol/server-gdrive` | Ask: "List files in my Drive" |
| GitHub | `npx @modelcontextprotocol/server-github` | Ask: "Show recent commits on utubooking repo" |

All 7 MCPs are pre-configured in `.mcp.json`. Only GA4, GSC, and DataForSEO require the manual setup above. The rest (Notion, Slack, GDrive, GitHub) only need their API tokens in `.env.mcp`.
