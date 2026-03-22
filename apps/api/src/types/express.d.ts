export {};

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth middleware. Only access on protected routes.
      creatorId: string;
    }
  }
}
