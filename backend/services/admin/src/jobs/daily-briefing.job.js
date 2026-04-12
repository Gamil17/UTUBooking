'use strict';

/**
 * daily-briefing.job.js
 *
 * Schedules the AI daily briefing at 08:00 Riyadh time (Asia/Riyadh = UTC+3)
 * every day. On startup it also checks whether today's briefing is missing and
 * generates it immediately if so (handles service restarts after 08:00).
 *
 * Called once from app.js: require('./src/jobs/daily-briefing.job').start()
 */

const cron                = require('node-cron');
const { Pool }            = require('pg');
const { runDailyBriefing } = require('../services/briefing-generator');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

async function hasTodaysBriefing() {
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    'SELECT 1 FROM ai_daily_briefings WHERE briefing_date = $1 LIMIT 1',
    [today],
  );
  return rows.length > 0;
}

async function safeRun() {
  try {
    await runDailyBriefing();
  } catch (err) {
    console.error('[briefing-job] failed:', err.message);
  }
}

function start() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[briefing-job] ANTHROPIC_API_KEY not set — daily briefing disabled');
    return;
  }

  // Schedule for 08:00 Riyadh time daily
  cron.schedule('0 8 * * *', safeRun, { timezone: 'Asia/Riyadh' });
  console.log('[briefing-job] scheduled for 08:00 Asia/Riyadh daily');

  // Catch-up: generate today's briefing if service restarted after 08:00
  const nowHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })).getHours();
  if (nowHour >= 8) {
    hasTodaysBriefing().then(exists => {
      if (!exists) {
        console.log('[briefing-job] catch-up: generating missed briefing for today');
        safeRun();
      }
    }).catch(() => {});
  }
}

module.exports = { start };
