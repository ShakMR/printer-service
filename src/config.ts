import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { LogLevel } from './logger';

dotenv.config();
if ((process as NodeJS.Process & { pkg?: boolean }).pkg) {
  dotenv.config({ path: path.join(path.dirname(process.execPath), '.env') });
}

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

export function loadConfig(env: NodeJS.ProcessEnv = process.env, argv: string[] = []): Config {
  const settings = { ...env, ...parseCommandLine(argv) };
  const logLevel = settings.LOG_LEVEL?.trim().toLowerCase() || 'info';
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new Error('LOG_LEVEL must be one of: debug, info, warn, error');
  }
  const defaultLogFile = path.join(os.homedir(), 'Library', 'Logs', 'lan-print-server', 'server.log');
  return {
    host: settings.HOST?.trim() || '0.0.0.0',
    port: positiveInteger(settings.PORT, 3000, 'PORT'),
    maxUploadBytes: positiveInteger(settings.MAX_UPLOAD_BYTES, 10 * 1024 * 1024, 'MAX_UPLOAD_BYTES'),
    tempDir: settings.TEMP_DIR?.trim() || os.tmpdir(),
    logLevel: logLevel as LogLevel,
    logFile: (settings.LOG_FILE?.trim() || defaultLogFile).replace(/^~(?=$|\/)/, os.homedir()),
    logMaxBytes: positiveInteger(settings.LOG_MAX_BYTES, 10 * 1024 * 1024, 'LOG_MAX_BYTES'),
  };
}

function parseCommandLine(argv: string[]): NodeJS.ProcessEnv {
  const values: NodeJS.ProcessEnv = {};
  const names: Record<string, string> = {
    '--host': 'HOST',
    '--port': 'PORT',
    '--max-upload-bytes': 'MAX_UPLOAD_BYTES',
    '--temp-dir': 'TEMP_DIR',
    '--log-level': 'LOG_LEVEL',
    '--log-file': 'LOG_FILE',
    '--log-max-bytes': 'LOG_MAX_BYTES',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const [option, inlineValue] = argv[index].split('=', 2);
    const envName = names[option];
    if (!envName) continue;
    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`${option} requires a value`);
    values[envName] = value;
  }
  return values;
}

export const config = loadConfig(process.env, process.argv.slice(2));
