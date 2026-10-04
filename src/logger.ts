import { promises as fs } from 'node:fs';
import path from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  level: LogLevel;
  file: string;
  maxBytes: number;
  console?: Pick<Console, 'error' | 'log' | 'warn'>;
}

function errorFields(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { error };
  return { error: error.message, errorName: error.name, stack: error.stack };
}

export class JsonFileLogger implements Logger {
  private writeQueue: Promise<void> = Promise.resolve();
  private fileSize = 0;
  private initialized = false;
  private readonly output: Pick<Console, 'error' | 'log' | 'warn'>;

  constructor(private readonly options: LoggerOptions) {
    this.output = options.console ?? console;
  }

  debug(message: string, fields: Record<string, unknown> = {}): void { this.write('debug', message, fields); }
  info(message: string, fields: Record<string, unknown> = {}): void { this.write('info', message, fields); }
  warn(message: string, fields: Record<string, unknown> = {}): void { this.write('warn', message, fields); }
  error(message: string, fields: Record<string, unknown> = {}): void { this.write('error', message, fields); }

  private write(level: LogLevel, message: string, fields: Record<string, unknown>): void {
    if (priorities[level] < priorities[this.options.level]) return;
    const line = `${JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...fields })}\n`;
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    this.output[consoleMethod](line.trim());
    this.writeQueue = this.writeQueue.then(() => this.append(line)).catch((error) => {
      this.output.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: 'Failed to write log file', ...errorFields(error) }));
    });
  }

  private async append(line: string): Promise<void> {
    if (!this.initialized) {
      await fs.mkdir(path.dirname(this.options.file), { recursive: true });
      try { this.fileSize = (await fs.stat(this.options.file)).size; } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      this.initialized = true;
    }
    const lineBytes = Buffer.byteLength(line);
    if (this.fileSize + lineBytes > this.options.maxBytes) {
      await fs.rm(`${this.options.file}.1`, { force: true });
      try { await fs.rename(this.options.file, `${this.options.file}.1`); } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      this.fileSize = 0;
    }
    await fs.appendFile(this.options.file, line, 'utf8');
    this.fileSize += lineBytes;
  }
}

export function createLogger(options: LoggerOptions): Logger {
  return new JsonFileLogger(options);
}
