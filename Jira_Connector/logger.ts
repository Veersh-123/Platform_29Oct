import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Create a logger instance with file and console output
 */
export function createLogger(logName: string): winston.Logger {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFilePath = path.join(logsDir, `${logName}-${timestamp}.log`);

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      })
    ),
    transports: [
      // Console output
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ message }: any) => message)
        )
      }),
      // File output
      new winston.transports.File({
        filename: logFilePath,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
          })
        )
      })
    ]
  });
}

/**
 * Helper function to log with emoji for console output (emoji not in file logs)
 */
export function logWithEmoji(logger: winston.Logger, emoji: string, message: string): void {
  // Get the console transport to log with emoji
  const consoleTransport = logger.transports.find(t => t instanceof winston.transports.Console);
  if (consoleTransport) {
    console.log(`${emoji} ${message}`);
  }
  logger.info(message);
}
