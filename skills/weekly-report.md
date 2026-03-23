# Skill: Weekly Report
## Trigger: Every Monday morning automatically
## Steps:
1. Pull last 7 days of leads from HubSpot MCP
2. Pull open tasks and sprint status from Notion MCP
3. Pull revenue figures from Zoho Books API
4. Generate MD report with sections:
   - Sales pipeline summary
   - Dev velocity (PRs merged, bugs fixed)
   - Financial snapshot (MRR, expenses)
   - Top 3 priorities for the week
5. Post report to #ceo-reports channel in Slack
