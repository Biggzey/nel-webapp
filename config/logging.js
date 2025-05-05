import winston from 'winston';
import path from 'path';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Configure different transports for different environments
const transports = [
    // Always log errors to a separate file
    new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
    // Log everything to combined.log
    new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    })
];

// Add Console transport in development
if (process.env.NODE_ENV !== 'production') {
    transports.push(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports,
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({ 
            filename: path.join(logsDir, 'exceptions.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({ 
            filename: path.join(logsDir, 'rejections.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

export default logger; 