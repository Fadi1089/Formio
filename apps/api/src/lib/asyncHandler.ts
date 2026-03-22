import { Request, Response, NextFunction } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Wraps an async Express handler so unhandled promise rejections
// are forwarded to Express's error middleware instead of crashing.
export function asyncHandler(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
