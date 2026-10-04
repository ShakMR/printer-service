import { MacosPrinterService } from './macos-printer-service';
import { PrinterService } from '../types/printer';
import { Logger } from '../logger';

export function createPrinterService(platform = process.platform, logger?: Logger): PrinterService {
  if (platform === 'darwin') return new MacosPrinterService(undefined, logger);
  throw new Error(`Unsupported operating system: ${platform}. This server currently supports macOS only.`);
}
