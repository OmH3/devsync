import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

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
    
    if (dbState !== 1) {
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