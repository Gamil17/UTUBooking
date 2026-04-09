#!/usr/bin/env node
/**
 * i18n:validate — checks all locale JSON files have 100% key coverage vs en.json
 * Run: npm run i18n:validate
 * Exit 0 = all good. Exit 1 = missing keys found.
 */

const fs   = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../locales');

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const enPath = path.join(LOCALES_DIR, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enKeys = new Set(collectKeys(enData));

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');

let hasErrors = false;

for (const file of files.sort()) {
  const locale = file.replace('.json', '');
  const data   = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
  const keys   = new Set(collectKeys(data));

  const missing = [...enKeys].filter(k => !keys.has(k));
  const extra   = [...keys].filter(k => !enKeys.has(k));

  if (missing.length === 0) {
    console.log(`  ${locale}: OK (${keys.size} keys)`);
  } else {
    hasErrors = true;
    console.error(`  ${locale}: MISSING ${missing.length} keys`);
    for (const k of missing.slice(0, 10)) {
      console.error(`    - ${k}`);
    }
    if (missing.length > 10) {
      console.error(`    ... and ${missing.length - 10} more`);
    }
  }

  if (extra.length > 0) {
    console.warn(`  ${locale}: ${extra.length} extra keys (not in en.json — OK if locale-specific)`);
  }
}

if (hasErrors) {
  console.error('\nValidation FAILED — fix missing keys before merging.');
  process.exit(1);
} else {
  console.log(`\nAll ${files.length} locales valid.`);
  process.exit(0);
}
