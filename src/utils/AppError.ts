export default class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }

  static badRequest(message = 'Bad Request'): AppError {
    return new AppError(message, 400);
  }

  static notFound(message = 'Not Found'): AppError {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflict'): AppError {
    return new AppError(message, 409);
  }
}
