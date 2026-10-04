import os from 'node:os';
import path from 'node:path';
import 'dotenv/config';
import { LogLevel } from './logger';

export interface Config {
  host: string;
  port: number;
  maxUploadBytes: number;
  tempDir: string;
  logLevel: LogLevel;
  logFile: string;
  logMaxBytes: number;
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const logLevel = env.LOG_LEVEL?.trim().toLowerCase() || 'info';
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new Error('LOG_LEVEL must be one of: debug, info, warn, error');
  }
  const defaultLogFile = path.join(os.homedir(), 'Library', 'Logs', 'lan-print-server', 'server.log');
  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port: positiveInteger(env.PORT, 3000, 'PORT'),
    maxUploadBytes: positiveInteger(env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024, 'MAX_UPLOAD_BYTES'),
    tempDir: env.TEMP_DIR?.trim() || os.tmpdir(),
    logLevel: logLevel as LogLevel,
    logFile: (env.LOG_FILE?.trim() || defaultLogFile).replace(/^~(?=$|\/)/, os.homedir()),
    logMaxBytes: positiveInteger(env.LOG_MAX_BYTES, 10 * 1024 * 1024, 'LOG_MAX_BYTES'),
  };
}

export const config = loadConfig();
