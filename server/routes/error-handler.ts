import { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware for API routes
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err);
  
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message
    });
  }
  
  // For database constraint errors
  if (err.message?.includes('duplicate key') || err.message?.includes('violates unique constraint')) {
    return res.status(409).json({
      message: 'A record with this information already exists'
    });
  }
  
  // Default error
  return res.status(500).json({
    message: 'An unexpected error occurred'
  });
}