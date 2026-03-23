const app  = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[auth-service] running on port ${PORT}`);
  console.log(`[auth-service] POST /api/auth/register`);
  console.log(`[auth-service] POST /api/auth/login`);
  console.log(`[auth-service] POST /api/auth/refresh`);
  console.log(`[auth-service] POST /api/auth/logout`);
});
