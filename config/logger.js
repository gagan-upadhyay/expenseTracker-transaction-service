import { createLogger, format, transports } from "winston";

const isProduction = process.env.NODE_ENV === 'production';

// Custom format for local development (human-friendly)
const devFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Standard format for production (machine-friendly)
const prodFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }), // Captures stack traces
    format.json()
);

// logger.js - Fix
export const logger = createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: isProduction ? prodFormat : devFormat,
    transports: [
        new transports.Console(), // Let it inherit the global format
        ...(isProduction 
            ? [new transports.File({ filename: 'logs/error.log', level: 'error' })] 
            : []
        )
    ],
    exitOnError: false, 
});

