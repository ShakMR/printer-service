import path from 'node:path';
import express, { ErrorRequestHandler } from 'express';
import { Config } from '../config';
import { createPrinterService } from '../services/printer-service';
import { PrinterService } from '../types/printer';
import { createPrintersRouter } from './routes/printers';
import { createPrintRouter } from './routes/print';
import { Logger, createLogger } from '../logger';

export function createApp(
  appConfig: Config,
  printerService?: PrinterService,
  appLogger?: Logger,
): express.Express {
  const logger = appLogger ?? createLogger({ level: appConfig.logLevel, file: appConfig.logFile, maxBytes: appConfig.logMaxBytes });
  const service = printerService ?? createPrinterService(process.platform, logger);
  const app = express();
  app.disable('x-powered-by');
  app.use((request, response, next) => {
    const startedAt = Date.now();
    response.on('finish', () => logger.info('HTTP request completed', {
      method: request.method, path: request.path, statusCode: response.statusCode, durationMs: Date.now() - startedAt,
    }));
    next();
  });
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/printers', createPrintersRouter(service, logger));
  app.use('/api/print', createPrintRouter(service, appConfig, logger));
  app.use(express.static(path.resolve(__dirname, '../../public')));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    logger.error('Unhandled HTTP error', { error: error instanceof Error ? error.message : error });
    if (!response.headersSent) response.status(500).json({ error: 'Internal server error.' });
  };
  app.use(errorHandler);
  return app;
}
