'use strict';

const Handlebars = require('handlebars');
const fs         = require('fs');
const path       = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// Cache compiled templates in memory (key: `${templateName}:${locale}`)
const cache = new Map();

/**
 * Format a date string for display.
 * e.g. "2026-04-10" → "Thu, 10 Apr 2026"
 */
Handlebars.registerHelper('fmtDate', (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
});

/**
 * Format a price with currency code.
 * e.g. (350, 'SAR') → "SAR 350"
 */
Handlebars.registerHelper('fmtPrice', (amount, currency) => {
  if (amount == null) return '';
  return `${currency} ${Number(amount).toLocaleString('en', { minimumFractionDigits: 0 })}`;
});

/**
 * render(templateName, locale, data)
 *
 * Loads and renders the Handlebars template for the given locale.
 * Falls back to 'en' if locale-specific template does not exist.
 *
 * @param {string} templateName  e.g. 'abandoned_booking'
 * @param {string} locale        e.g. 'ar', 'en', 'fr'
 * @param {object} data          template context data
 * @returns {string} rendered HTML
 */
function render(templateName, locale, data) {
  // Normalise locale: 'ar-SA' → 'ar', 'en-GB' → 'en'
  const baseLang = (locale ?? 'en').split('-')[0].toLowerCase();

  const cacheKey = `${templateName}:${baseLang}`;

  if (!cache.has(cacheKey)) {
    // Try locale-specific file first, fall back to 'en'
    const candidates = [
      path.join(TEMPLATES_DIR, templateName, `${baseLang}.html`),
      path.join(TEMPLATES_DIR, templateName, 'en.html'),
    ];

    let source = null;
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        source = fs.readFileSync(filePath, 'utf8');
        break;
      }
    }

    if (!source) {
      throw new Error(`Template not found: ${templateName} (locale: ${baseLang})`);
    }

    cache.set(cacheKey, Handlebars.compile(source));
  }

  const template = cache.get(cacheKey);
  return template({ ...data, currentYear: new Date().getFullYear() });
}

/**
 * clearCache() — used in tests to force template reload
 */
function clearCache() {
  cache.clear();
}

module.exports = { render, clearCache };
