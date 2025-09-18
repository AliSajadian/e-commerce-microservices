// src/middleware/not-found.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const logger = new Logger('NotFoundHandler');
  
  const message = `Route ${req.originalUrl} not found`;
  
  logger.warn(message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    error: {
      message,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
    },
  });
};