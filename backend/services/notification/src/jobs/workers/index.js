'use strict';

const { notificationQueue }            = require('../queue');
const { processScanAbandonedBookings, processAbandonedBookingEmail } = require('../processors/abandonedBooking.processor');
const { processScanCheckInReminders }  = require('../processors/checkInReminder.processor');
const { processScanPriceChangeAlerts } = require('../processors/priceChangeAlert.processor');
const { processCampaignDispatch }      = require('../processors/campaignBatch.processor');

function registerWorkers() {
  notificationQueue.process('scan-abandoned-bookings', async () => {
    return processScanAbandonedBookings();
  });

  notificationQueue.process('scan-checkin-reminders', async () => {
    return processScanCheckInReminders();
  });

  notificationQueue.process('scan-price-change-alerts', async () => {
    return processScanPriceChangeAlerts();
  });

  notificationQueue.process('dispatch-campaigns', async () => {
    return processCampaignDispatch();
  });

  // Manual trigger — single booking recovery
  notificationQueue.process('trigger-abandoned-booking', async (job) => {
    return processAbandonedBookingEmail({ bookingId: job.data.bookingId });
  });

  notificationQueue.on('failed', (job, err) => {
    console.error(`[worker] Job "${job.name}" (id=${job.id}) failed:`, err.message);
  });

  notificationQueue.on('completed', (job, result) => {
    console.log(`[worker] Job "${job.name}" (id=${job.id}) completed:`, JSON.stringify(result));
  });

  console.log('[worker] Registered 5 Bull processors');
}

module.exports = { registerWorkers };
