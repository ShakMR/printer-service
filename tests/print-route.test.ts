import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/http/app';
import { PrinterService } from '../src/types/printer';
import { PrinterSystemError, UnknownPrinterError } from '../src/services/macos-printer-service';

const pdf = Buffer.from('%PDF-1.7\nmock pdf');
const baseConfig = {
  host: '127.0.0.1', port: 0, maxUploadBytes: 1000, tempDir: os.tmpdir(),
  logLevel: 'error' as const, logFile: path.join(os.tmpdir(), 'lan-print-server-test.log'), logMaxBytes: 100000,
};

function service(overrides: Partial<PrinterService> = {}): PrinterService {
  return {
    listPrinters: async () => [{ id: 'Office Printer', name: 'Office Printer', available: true }],
    print: async () => ({ accepted: true, jobId: 'job-1' }),
    ...overrides,
  };
}

describe('POST /api/print', () => {
  it('accepts a PDF and cleans up its temporary file', async () => {
    let printedPath = '';
    const app = createApp(baseConfig, service({ print: async (_id, filePath) => { printedPath = filePath; return { accepted: true, jobId: 'job-1' }; } }));
    const response = await request(app).post('/api/print').field('printer', 'Office Printer').attach('file', pdf, 'document.pdf');
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ accepted: true, jobId: 'job-1' });
    expect(printedPath).toMatch(/lan-print-.*\.pdf$/);
    await expect(fs.access(printedPath)).rejects.toThrow();
  });

  it('rejects missing, non-PDF, and oversized uploads', async () => {
    const app = createApp(baseConfig, service());
    expect((await request(app).post('/api/print').field('printer', 'Office Printer')).status).toBe(400);
    expect((await request(app).post('/api/print').field('printer', 'Office Printer').attach('file', Buffer.from('hello'), 'x.pdf')).status).toBe(400);
    expect((await request(app).post('/api/print').field('printer', 'Office Printer').attach('file', Buffer.alloc(1001, 65), 'x.pdf')).status).toBe(413);
  });

  it('maps unknown printers and print-system failures', async () => {
    const unknown = createApp(baseConfig, service({ print: async () => { throw new UnknownPrinterError('missing'); } }));
    expect((await request(unknown).post('/api/print').field('printer', 'missing').attach('file', pdf, 'x.pdf')).status).toBe(404);
    const failed = createApp(baseConfig, service({ print: async () => { throw new PrinterSystemError('failure'); } }));
    expect((await request(failed).post('/api/print').field('printer', 'Office Printer').attach('file', pdf, 'x.pdf')).status).toBe(502);
  });
});
