'use strict';
const express    = require('express');
const dealsRouter     = require('./src/routes/deals.router');
const contactsRouter  = require('./src/routes/contacts.router');
const activitiesRouter = require('./src/routes/activities.router');
const partnersRouter  = require('./src/routes/partners.router');
const repsRouter      = require('./src/routes/reps.router');
const analyticsRouter = require('./src/routes/analytics.router');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sales-service' }));

app.use('/api/sales/deals',         dealsRouter);
app.use('/api/sales/contacts',      contactsRouter);
app.use('/api/sales/deals',         activitiesRouter);   // deals/:id/activities
app.use('/api/sales/hotel-partners', partnersRouter);
app.use('/api/sales/reps',          repsRouter);
app.use('/api/sales',               analyticsRouter);    // /stats /overdue /funnel

module.exports = app;
