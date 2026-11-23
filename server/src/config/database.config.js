import mongoose from 'mongoose';
import { config } from './app.config.js';
export default function connectDatabase() {
  return mongoose.connect(config.MONGO_URI, {
    maxPoolSize: config.MONGO_MAX_POOL_SIZE,
    serverSelectionTimeoutMS: config.MONGO_SERVER_SELECTION_TIMEOUT_MS,
  });
}
