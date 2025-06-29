import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { SlackService } from '../../communication/slack/slack.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly slackService: SlackService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (
      exception instanceof HttpException &&
      typeof exception.getResponse === 'function'
    ) {
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'success' in exceptionResponse &&
        'message' in exceptionResponse &&
        'errors' in exceptionResponse
      ) {
        return response.status(status).json(exceptionResponse);
      }
    }

    await this.slackService.sendExceptionMessage({
      exception,
      status,
    });

    let message = 'Internal server error';
    if (status === HttpStatus.UNAUTHORIZED) {
      message = 'Unauthorized';
    } else if (status === HttpStatus.FORBIDDEN) {
      message = 'Forbidden action';
    }

    return response.status(status).json({
      success: false,
      message,
      errors: null,
    });
  }
}

