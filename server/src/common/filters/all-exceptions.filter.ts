import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { Request, Response } from 'express';

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
  errors?: Record<string, { message: string }>;
  kind?: string;
  value?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private getErrorMessage(status: number): string {
    const statusMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
    };
    return statusMap[status] || 'Internal Server Error';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;
    const isProduction = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Error) {
      // Handle MongoDB errors
      const mongoError = exception as MongoError;

      // Handle duplicate key error (indexing)
      if (mongoError.code === 11000 || mongoError.name === 'MongoServerError') {
        const field = Object.keys(mongoError.keyPattern || {})[0];
        status = HttpStatus.CONFLICT;
        message = `A user with this ${field || 'field'} already exists`;
      }
      // Handle validation errors
      else if (mongoError.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        const errors = mongoError.errors || {};
        message = Object.keys(errors).reduce(
          (acc, key) => {
            acc[key] = errors[key]?.message || 'Invalid field';
            return acc;
          },
          {} as Record<string, string>,
        );
      }
      // Handle cast errors (invalid ObjectId)
      else if (mongoError.name === 'CastError') {
        status = HttpStatus.BAD_REQUEST;
        message = `Invalid ${mongoError.kind}: ${mongoError.value}`;
      }
      // Default error handling
      else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = isProduction ? 'Internal server error' : exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    // Log the error
    this.logger.error({
      path: request.url,
      method: request.method,
      message: exception instanceof Error ? exception.message : exception,
      stack: isProduction
        ? undefined
        : exception instanceof Error
          ? exception.stack
          : null,
    });

    // Handle custom exception format (already has statusCode, message, error, timestamp)
    if (
      typeof message === 'object' &&
      message !== null &&
      'statusCode' in message &&
      'error' in message
    ) {
      return response.status(status).json(message);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: this.getErrorMessage(status),
      timestamp: new Date().toISOString(),
      ...(request.method && { method: request.method }),
      ...(request.url && { path: request.url }),
      ...(!isProduction &&
        exception instanceof Error && { stack: exception.stack }),
    });
  }
}
