import { CommandRunner, productionCommandRunner } from './command-runner';
import { Printer, PrinterService, PrintJobResult } from '../types/printer';
import { Logger, createLogger } from '../logger';
import { config } from '../config';

export class UnknownPrinterError extends Error {
  constructor(public readonly printerId: string) {
    super(`Unknown printer: ${printerId}`);
    this.name = 'UnknownPrinterError';
  }
}

export class PrinterSystemError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PrinterSystemError';
  }
}

export function parseLpstatPrinters(output: string): Printer[] {
  const printers: Printer[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^printer\s+(.+?)\s+(?:is\s+)?(idle|printing|disabled)\b/i.exec(line.trim());
    if (!match) continue;
    const name = match[1].trim();
    if (!name) continue;
    printers.push({ id: name, name, available: match[2].toLowerCase() !== 'disabled' });
  }
  return printers;
}

export class MacosPrinterService implements PrinterService {
  constructor(
    private readonly runner: CommandRunner = productionCommandRunner,
    private readonly logger: Logger = createLogger({ level: config.logLevel, file: config.logFile, maxBytes: config.logMaxBytes }),
  ) {}

  async listPrinters(): Promise<Printer[]> {
    try {
      this.logger.debug('Discovering printers with lpstat', { command: 'lpstat', args: ['-p'] });
      const result = await this.runner.run('lpstat', ['-p']);
      const printers = parseLpstatPrinters(result.stdout);
      this.logger.debug('Printer discovery completed', { printerCount: printers.length, printers, stderr: result.stderr || undefined });
      return printers;
    } catch (error) {
      this.logger.error('Printer discovery failed', { command: 'lpstat', args: ['-p'], ...errorFields(error) });
      throw new PrinterSystemError('Unable to discover printers', error);
    }
  }

  async print(printerId: string, pdfPath: string): Promise<PrintJobResult> {
    this.logger.debug('Validating selected printer', { printerId });
    if (!printerId.trim()) {
      this.logger.warn('Print request rejected because printer identifier was empty');
      throw new UnknownPrinterError(printerId);
    }
    const printers = await this.listPrinters();
    if (!printers.some((printer) => printer.id === printerId)) {
      this.logger.warn('Print request rejected because printer was not discovered', { printerId });
      throw new UnknownPrinterError(printerId);
    }
    try {
      this.logger.debug('Submitting PDF to lp', { command: 'lp', args: ['-d', printerId, pdfPath] });
      const result = await this.runner.run('lp', ['-d', printerId, pdfPath]);
      const jobId = /request id is\s+([^\s]+)/i.exec(`${result.stdout}\n${result.stderr}`)?.[1];
      this.logger.info('Print job accepted by macOS print system', { printerId, jobId, stdout: result.stdout, stderr: result.stderr || undefined });
      return { accepted: true, ...(jobId ? { jobId } : {}) };
    } catch (error) {
      this.logger.error('Print command failed', { command: 'lp', args: ['-d', printerId, pdfPath], ...errorFields(error) });
      throw new PrinterSystemError('The macOS print system rejected the job', error);
    }
  }
}

function errorFields(error: unknown): Record<string, unknown> {
  return error instanceof Error ? { error: error.message, errorName: error.name, stack: error.stack } : { error };
}
