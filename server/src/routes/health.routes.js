import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/health/live', (req, res) => res.json({ status: 'alive' }));
router.get('/health/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1 && !req.app.locals.draining;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
});

router.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'DevSync API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    version: '1.0.0'
  };

  try {
    const dbState = mongoose.connection.readyState;
    health.database = dbState === 1 ? 'connected' : 'disconnected';
    
    if (dbState !== 1 || req.app.locals.draining) {
      return res.status(503).json(health);
    }

    res.status(200).json(health);
  } catch (error) {
    health.database = 'error';
    health.error = error.message;
    res.status(503).json(health);
  }
});

export default router;
