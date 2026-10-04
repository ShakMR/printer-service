import { Router } from 'express';
import { PrinterSystemError } from '../../services/macos-printer-service';
import { PrinterService } from '../../types/printer';
import { Logger } from '../../logger';

export function createPrintersRouter(printerService: PrinterService, logger: Logger): Router {
  const router = Router();
  router.get('/', async (_request, response, next) => {
    try {
      logger.debug('HTTP printer list requested');
      response.json({ printers: await printerService.listPrinters() });
    } catch (error) {
      if (error instanceof PrinterSystemError) {
        response.status(502).json({ error: 'Unable to discover printers.' });
        return;
      }
      next(error);
    }
  });
  return router;
}
