---
name: mcp-setup
description: MCP connection guide and CLI reference for Claude Code. Use when asked
  about MCP, integrations, connecting to tools, or setting up GitHub/Notion/databases.
  Provides exact CLI commands, scope table, troubleshooting, and 6-step checklist
  for any new MCP server.
---

# MCP Setup — Quick Reference

---

## CLI Commands

```bash
# Add a cloud service (GitHub, Notion, Sentry, etc.)
claude mcp add --transport http <name> <url>

# Add a cloud service with auth header
claude mcp add --transport http <name> <url> --header "Authorization: Bearer <token>"

# Add a local tool (database, custom script)
claude mcp add --transport stdio <name> -- <command>

# Add a local tool with API key
claude mcp add --transport stdio <name> --env API_KEY=<value> -- <command>

# List all connections
claude mcp list

# Check status inside Claude Code
/mcp

# Authenticate via browser
/mcp > select service > Authenticate

# Remove a connection
claude mcp remove <name>
```

**Important:** All flags must come BEFORE the server name.
Use `--` to separate the name from the command in stdio mode.

---

## Scopes

| Scope | Flag | Use Case |
|---|---|---|
| local (default) | no flag | Personal, this project only |
| project | `--scope project` | Team-shared via `.mcp.json` committed to Git |
| user | `--scope user` | Personal, applies across ALL your projects |

UTUBooking uses `--scope project` for GA4, GSC, and DataForSEO.
Config stored in `.mcp.json` at project root.

---

## 6-Step Setup Checklist for Any New MCP

- [ ] Step 1: Identify service type — cloud service = HTTP/SSE, local tool = stdio
- [ ] Step 2: Get the MCP URL or command from the service's docs
- [ ] Step 3: Run the appropriate `claude mcp add` command
- [ ] Step 4: Verify with `claude mcp list`
- [ ] Step 5: Authenticate if needed — `/mcp` > Authenticate
- [ ] Step 6: Test with a simple request ('List my open pull requests', 'Show GA4 sessions', etc.)

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Windows 'Connection closed' | Add `cmd /c` before `npx` commands |
| Tools not appearing | Restart Claude Code after adding MCPs |
| Auth failing | `/mcp` > 'Clear authentication' > retry |
| Timeout errors | Set `MCP_TIMEOUT=30000 claude` for longer startup |
| GA4 not connecting | Run: `gcloud auth application-default login` |
| GSC not connecting | Delete `token.json` in `mcp-gsc/` folder and retry |
| DataForSEO 401 | API password ≠ account password — check Dashboard |
| `.mcp.json` not loading | Restart Claude Code; confirm file is at project root |

---

## UTUBooking MCP Status

Full config: `.mcp.json` (project root)
Full setup SOP: `skills/seo-command-center/SETUP.md`

| MCP | Transport | Status | Config location |
|---|---|---|---|
| GA4 (`analytics`) | stdio — pipx binary | ⚠️ Needs service account | `.mcp.json` |
| GSC (`gsc`) | stdio — Python venv | ⚠️ Needs `client_secrets.json` | `.mcp.json` |
| DataForSEO | stdio — npx | ⚠️ Needs credentials in `.env.mcp` | `.mcp.json` |
| Notion | stdio — npx | ⚠️ Needs `NOTION_API_KEY` | `.mcp.json` |
| Slack | stdio — npx | ⚠️ Needs `SLACK_BOT_TOKEN` | `.mcp.json` |
| GitHub | stdio — npx | ⚠️ Needs PAT | `.mcp.json` |

Verify all after setup: `claude mcp list` — all 6 should appear.
