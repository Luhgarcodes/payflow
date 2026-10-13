import type { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: unknown,
  message: string,
  statusCode = 200,
): void => {
  res.status(statusCode).json({ status: 'success', data, message });
};
