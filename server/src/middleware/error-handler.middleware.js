import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred. Please try again.';
  let fields;
  if (error instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Please check the highlighted fields.';
    fields = error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }));
  } else if (error.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body must be valid JSON.';
  } else if (error.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request exceeds the allowed size.';
  } else if (error instanceof AppError) {
    status = error.statusCode; code = error.errorCode; message = error.message;
  } else if (error.name === 'CastError') {
    status = 400; code = 'INVALID_IDENTIFIER'; message = 'Invalid resource identifier.';
  } else if (error.code === 11000) {
    status = 409; code = 'CONFLICT'; message = 'A record with these details already exists.';
  }
  // The request completion logger owns the single error log; never attach raw bodies.
  res.err = status >= 500 ? error : undefined;
  return res.status(status).json({
    message, errorCode: code, error: { code, message, ...(fields ? { fields } : {}) }, requestId: req.id,
  });
}
