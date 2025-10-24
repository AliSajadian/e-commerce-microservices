import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    // Log the full error details
    this.logger.error(`HTTP ${status} Error`);
    this.logger.error(`Request: ${request.method} ${request.url}`);
    this.logger.error(`Body: ${JSON.stringify(request.body)}`);
    this.logger.error(`Exception:`, exception);

    // If it's a validation error, log the detailed validation messages
    if (exception instanceof HttpException && status === 400) {
      const errorResponse = exception.getResponse() as any;
      if (errorResponse.message && Array.isArray(errorResponse.message)) {
        this.logger.error('Validation errors:', errorResponse.message);
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}