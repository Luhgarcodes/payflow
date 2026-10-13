import type { RequestHandler } from 'express';

const notFound: RequestHandler = (req, res) => {
  res
    .status(404)
    .json({ status: 'error', message: `Route ${req.method} ${req.originalUrl} not found` });
};

export default notFound;
