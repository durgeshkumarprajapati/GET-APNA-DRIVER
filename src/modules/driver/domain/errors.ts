import { AppError } from '@/shared/errors/app-error';

export class DriverProfileNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Driver profile not found for: ${identifier}`, 404, 'DRIVER_PROFILE_NOT_FOUND');
  }
}

export class InvalidDriverStatusTransitionError extends AppError {
  constructor(from: string, to: string, entity = 'onboarding status') {
    super(
      `Invalid driver ${entity} transition from ${from} to ${to}`,
      409,
      'DRIVER_INVALID_STATUS_TRANSITION',
    );
  }
}

export class DriverNotEligibleError extends AppError {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(
      `Driver is not eligible to go available: ${reasons.join('; ')}`,
      403,
      'DRIVER_NOT_ELIGIBLE',
    );
    this.reasons = reasons;
  }
}

export class DocumentNotFoundError extends AppError {
  constructor(documentId: string) {
    super(`Driver document not found: ${documentId}`, 404, 'DRIVER_DOCUMENT_NOT_FOUND');
  }
}

export class InvalidDocumentTypeError extends AppError {
  constructor(documentType: string) {
    super(
      `Invalid or unsupported document type: ${documentType}`,
      400,
      'DRIVER_INVALID_DOCUMENT_TYPE',
    );
  }
}

export class FileTooLargeError extends AppError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `File size (${sizeBytes} bytes) exceeds maximum allowed limit (${maxBytes} bytes)`,
      400,
      'DRIVER_FILE_TOO_LARGE',
    );
  }
}

export class InvalidContentTypeError extends AppError {
  constructor(contentType: string, allowed: string[]) {
    super(
      `Content type '${contentType}' is not allowed. Allowed types: ${allowed.join(', ')}`,
      400,
      'DRIVER_INVALID_CONTENT_TYPE',
    );
  }
}

export class InvalidScheduleTimeError extends AppError {
  constructor(message: string) {
    super(message, 400, 'INVALID_SCHEDULE_TIME');
  }
}

export class DriverScheduleConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'DRIVER_SCHEDULE_CONFLICT');
  }
}

export class ScheduleExceptionNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Schedule exception not found: ${identifier}`, 404, 'SCHEDULE_EXCEPTION_NOT_FOUND');
  }
}
