import 'express-serve-static-core';
import type { KycTier, Role, UserId } from './domain';

export interface AuthenticatedUser {
  id: UserId;
  role: Role;
  kycTier: KycTier;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
