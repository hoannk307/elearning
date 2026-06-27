import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AiError } from './ai.errors';

/**
 * Map {@link AiError} (từ các endpoint AI đồng bộ như chấm bài, đánh giá) sang
 * HTTP có thông báo thân thiện. Lỗi tạm thời → 503, lỗi cấu hình/đầu vào → 400.
 */
@Catch(AiError)
export class AiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('AiExceptionFilter');

  catch(err: AiError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status = err.retryable
      ? HttpStatus.SERVICE_UNAVAILABLE
      : HttpStatus.BAD_REQUEST;

    this.logger.error(`AI error (${status}): ${err.message}`);
    res.status(status).json({
      statusCode: status,
      message: err.userMessage,
      retryable: err.retryable,
    });
  }
}

/** Tiện ích: dùng trong service đồng bộ nếu muốn ném HttpException trực tiếp. */
export function asHttp(err: AiError): HttpException {
  const status = err.retryable
    ? HttpStatus.SERVICE_UNAVAILABLE
    : HttpStatus.BAD_REQUEST;
  return new HttpException(
    { statusCode: status, message: err.userMessage, retryable: err.retryable },
    status,
  );
}
