const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const healthRoutes = require('./routes/health.routes');

const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

app.use('/health', healthRoutes);

app.listen(config.port, () => {
  console.log(`Backend jalan di http://localhost:${config.port}`);
});
