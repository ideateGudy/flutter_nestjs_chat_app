import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
}

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string | string[];
}

/**
 * Detailed validation error response
 */
export interface ValidationErrorResponse extends ErrorResponse {
  details: ValidationErrorDetail[];
}

/**
 * Bad Request Exception with validation details
 */
export class BadRequestException extends HttpException {
  constructor(
    message: string,
    public details?: ValidationErrorDetail[],
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        ...(details && { details }),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Unauthorized Exception
 */
export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized access') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Forbidden Exception
 */
export class ForbiddenException extends HttpException {
  constructor(message: string = 'Access forbidden') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Forbidden',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Not Found Exception
 */
export class NotFoundException extends HttpException {
  constructor(message: string = 'Resource not found') {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: 'Not Found',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Conflict Exception
 */
export class ConflictException extends HttpException {
  constructor(message: string = 'Resource already exists') {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Internal Server Error Exception
 */
export class InternalServerErrorException extends HttpException {
  constructor(message: string = 'Internal server error') {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
