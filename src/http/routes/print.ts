import path from 'node:path';
import { promises as fs } from 'node:fs';
import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { Config } from '../../config';
import { PrinterSystemError, UnknownPrinterError } from '../../services/macos-printer-service';
import { PrinterService } from '../../types/printer';
import { Logger, createLogger } from '../../logger';

export function createPrintRouter(
  printerService: PrinterService,
  appConfig: Config,
  logger: Logger = createLogger({ level: appConfig.logLevel, file: appConfig.logFile, maxBytes: appConfig.logMaxBytes }),
): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: appConfig.maxUploadBytes, files: 1 } });

  router.post('/', (request, response, next) => {
    logger.debug('Received print upload request', { contentLength: request.headers['content-length'] });
    upload.single('file')(request, response, (uploadError) => {
      if (uploadError) {
        if (uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
          logger.warn('Rejected upload because it exceeded the size limit', { maxUploadBytes: appConfig.maxUploadBytes });
          response.status(413).json({ error: 'The PDF exceeds the configured size limit.' });
          return;
        }
        if (uploadError instanceof multer.MulterError) {
          response.status(400).json({ error: 'Malformed multipart upload.' });
          return;
        }
        next(uploadError);
        return;
      }
      void handlePrint(request, response, next, printerService, appConfig, logger);
    });
  });
  return router;
}

async function handlePrint(
  request: Request,
  response: Response,
  next: NextFunction,
  printerService: PrinterService,
  appConfig: Config,
  logger: Logger,
): Promise<void> {
  const printer = typeof request.body?.printer === 'string' ? request.body.printer : '';
  const file = request.file;
  if (!printer.trim() || !file) {
    logger.warn('Rejected print request because printer or file was missing', { hasPrinter: Boolean(printer.trim()), hasFile: Boolean(file) });
    response.status(400).json({ error: 'A printer and PDF file are required.' });
    return;
  }
  if (file.size === 0 || file.size < 5 || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    logger.warn('Rejected upload because it was not a valid PDF signature', { sizeBytes: file.size, originalName: file.originalname, mimetype: file.mimetype });
    response.status(400).json({ error: 'The uploaded file must be a non-empty PDF.' });
    return;
  }

  let temporaryPath: string | undefined;
  let statusCode = 201;
  let payload: Record<string, unknown> = {};
  let unexpectedError: unknown;
  try {
    const temporaryName = `lan-print-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    temporaryPath = path.join(appConfig.tempDir, temporaryName);
    logger.debug('Writing upload to temporary file', { temporaryPath, sizeBytes: file.size });
    await fs.writeFile(temporaryPath, file.buffer, { flag: 'wx' });
    const result = await printerService.print(printer, temporaryPath);
    logger.debug('Print service returned successfully', { printerId: printer, jobId: result.jobId });
    payload = { accepted: result.accepted, ...(result.jobId ? { jobId: result.jobId } : {}) };
  } catch (error) {
    if (error instanceof UnknownPrinterError) {
      statusCode = 404;
      payload = { error: 'The selected printer was not found.' };
    } else if (error instanceof PrinterSystemError) {
      statusCode = 502;
      payload = { error: 'The print system rejected the job.' };
    } else {
      unexpectedError = error;
    }
  } finally {
    if (temporaryPath) {
      await fs.rm(temporaryPath, { force: true }).catch((error) => logger.error('Failed to remove temporary upload', { temporaryPath, error: error instanceof Error ? error.message : error }));
      logger.debug('Temporary upload cleanup completed', { temporaryPath });
    }
  }
  if (unexpectedError) {
    next(unexpectedError);
    return;
  }
  response.status(statusCode).json(payload);
}
