import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const logger = new Logger('ErrorHandler');

  // Set default error values
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error ${err.message}`, {
    error: err,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      ...error,
      statusCode: 404,
      message,
    };
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = {
      ...error,
      statusCode: 400,
      message,
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    error = {
      ...error,
      statusCode: 400,
      message,
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      ...error,
      statusCode: 401,
      message,
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      ...error,
      statusCode: 401,
      message,
    };
  }

  // TypeORM errors
  if (err.name === 'QueryFailedError') {
    const message = 'Database query failed';
    error = {
      ...error,
      statusCode: 400,
      message,
    };
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    },
  });
};
