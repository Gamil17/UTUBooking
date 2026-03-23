const app = require('./app');

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`[hotel-service] running on port ${PORT}`);
});
