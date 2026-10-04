import { config } from './config';
import { createApp } from './http/app';
import { createLogger } from './logger';

const logger = createLogger({ level: config.logLevel, file: config.logFile, maxBytes: config.logMaxBytes });
const app = createApp(config, undefined, logger);
app.listen(config.port, config.host, () => {
  logger.info('LAN print server listening', { host: config.host, port: config.port, logFile: config.logFile });
});
