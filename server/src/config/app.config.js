import 'dotenv/config';
import { parseEnv } from './env.js';
export const config = parseEnv(process.env);
