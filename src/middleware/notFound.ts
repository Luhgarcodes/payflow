import type { RequestHandler } from 'express';
import AppError from '../utils/AppError';

const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError('ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
};

export default notFound;
