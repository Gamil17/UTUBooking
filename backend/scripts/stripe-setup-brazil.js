#!/usr/bin/env node
/**
 * stripe-setup-brazil.js
 *
 * Programmatically enables Pix + Boleto Bancário on your Stripe account
 * via the Payment Method Configurations API.
 *
 * Usage:
 *   node backend/scripts/stripe-setup-brazil.js            # dry-run (read-only)
 *   node backend/scripts/stripe-setup-brazil.js --apply    # write changes
 *
 * Requires:
 *   STRIPE_SECRET_KEY in environment (or backend/.env)
 *
 * Stripe docs:
 *   https://stripe.com/docs/payments/payment-method-configurations
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Stripe = require('stripe');

const DRY_RUN = !process.argv.includes('--apply');
const KEY     = process.env.STRIPE_SECRET_KEY;

if (!KEY) {
  console.error('❌  STRIPE_SECRET_KEY is not set. Add it to backend/.env or export it.');
  process.exit(1);
}

const stripe = Stripe(KEY);
const isLive = KEY.startsWith('sk_live_');

// ─── helpers ──────────────────────────────────────────────────────────────────

function mode(config) {
  const pix    = config.pix?.available   ? (config.pix.display_preference?.value   ?? 'unknown') : 'unavailable';
  const boleto = config.boleto?.available ? (config.boleto.display_preference?.value ?? 'unknown') : 'unavailable';
  return { pix, boleto };
}

function label(val) {
  if (val === 'on')          return '✅  on';
  if (val === 'off')         return '⚪  off';
  if (val === 'unavailable') return '🚫  unavailable (not supported on this account)';
  return `❓  ${val}`;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🇧🇷  Stripe Brazil Payment Methods Setup`);
  console.log(`    Mode : ${isLive ? '🔴 LIVE' : '🟡 TEST/SANDBOX'}`);
  console.log(`    Run  : ${DRY_RUN ? 'DRY-RUN (pass --apply to make changes)' : 'APPLYING CHANGES'}\n`);

  // 1. List all payment method configurations
  const { data: configs } = await stripe.paymentMethodConfigurations.list({ limit: 20 });

  if (!configs.length) {
    console.error('❌  No payment method configurations found on this account.');
    process.exit(1);
  }

  // Use the first active (default) configuration
  const config = configs.find(c => c.is_default) ?? configs[0];

  console.log(`📋  Configuration : "${config.name}" (id: ${config.id})`);
  console.log(`    Is default    : ${config.is_default ? 'yes' : 'no'}\n`);

  // 2. Show current state
  const before = mode(config);
  console.log('Current state:');
  console.log(`  Pix    : ${label(before.pix)}`);
  console.log(`  Boleto : ${label(before.boleto)}\n`);

  const pixNeeded    = before.pix    !== 'on' && before.pix    !== 'unavailable';
  const boletoNeeded = before.boleto !== 'on' && before.boleto !== 'unavailable';

  if (!pixNeeded && !boletoNeeded) {
    console.log('✅  Both Pix and Boleto are already enabled. Nothing to do.');
    return;
  }

  if (before.pix === 'unavailable' || before.boleto === 'unavailable') {
    console.warn('⚠️   One or more methods show as "unavailable".');
    console.warn('    This usually means your Stripe account has not been approved for');
    console.warn('    Brazilian payment methods yet. Contact Stripe support to enable');
    console.warn('    Brazil (BRL) on your account before running this script.\n');
    if (before.pix === 'unavailable' && before.boleto === 'unavailable') {
      process.exit(1);
    }
  }

  // 3. Build update payload — only include methods that exist on this config
  const updates = {};
  if (pixNeeded    && before.pix    !== 'unavailable') updates.pix    = { display_preference: { preference: 'on' } };
  if (boletoNeeded && before.boleto !== 'unavailable') updates.boleto = { display_preference: { preference: 'on' } };

  const methodNames = Object.keys(updates).join(' + ');
  console.log(`Changes to apply : enable ${methodNames}`);

  if (DRY_RUN) {
    console.log('\n🛑  DRY-RUN — no changes made.');
    console.log('    Re-run with --apply to write:\n');
    console.log(`    node backend/scripts/stripe-setup-brazil.js --apply\n`);
    return;
  }

  // 4. Apply
  console.log('\n⏳  Updating configuration…');
  const updated = await stripe.paymentMethodConfigurations.update(config.id, updates);

  const after = mode(updated);
  console.log('\nUpdated state:');
  console.log(`  Pix    : ${label(after.pix)}`);
  console.log(`  Boleto : ${label(after.boleto)}\n`);

  const allOn = after.pix !== 'off' && after.boleto !== 'off';
  if (allOn) {
    console.log('✅  Done! Pix + Boleto Bancário are now enabled on your Stripe account.');
    if (!isLive) {
      console.log('\n⚠️   You are in TEST mode. Run against your LIVE key before Brazil launch:');
      console.log('    STRIPE_SECRET_KEY=sk_live_... node backend/scripts/stripe-setup-brazil.js --apply');
    }
  } else {
    console.warn('⚠️   Some methods could not be enabled. Check Stripe Dashboard for details.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌  Stripe API error:', err.message ?? err);
  if (err.type === 'StripeAuthenticationError') {
    console.error('    Check that STRIPE_SECRET_KEY is correct.');
  }
  process.exit(1);
});
