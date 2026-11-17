import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../server/db.js';

export type MarketplaceRole = 'customer' | 'seller' | 'admin';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  sqlUserId?: number;
  userRole?: MarketplaceRole;
  sellerId?: string;
}

const ADMIN_EMAILS = new Set(['bansalshubham662@gmail.com']);

async function resolveUserContext(req: AuthRequest, decodedToken: DecodedIdToken) {
  req.user = decodedToken;
  const email = (decodedToken.email || '').toLowerCase();
  let resolvedRole: MarketplaceRole = ADMIN_EMAILS.has(email) ? 'admin' : 'customer';

  try {
    const sqlUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@users.nexora.local`,
      decodedToken.name || null
    );
    if (sqlUser) {
      req.sqlUserId = sqlUser.id;
      if (sqlUser.role === 'admin') {
        resolvedRole = 'admin';
      } else if (sqlUser.role === 'seller' && resolvedRole !== 'admin') {
        resolvedRole = 'seller';
      }
    }
  } catch (syncError) {
    console.error('SQL user synchronization warning:', syncError);
  }

  if (email) {
    const matchedSeller = await db.getSellerByEmail(email);
    if (matchedSeller) {
      req.sellerId = matchedSeller.id;
      if (resolvedRole === 'customer' && matchedSeller.status === 'approved') {
        resolvedRole = 'seller';
      }
    }
  }

  req.userRole = resolvedRole;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing token',
    });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    await resolveUserContext(req, decodedToken);
    return next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    await resolveUserContext(req, decodedToken);
  } catch {
    // Allow anonymous fallback on optional-auth routes
  }
  return next();
};

export const requireRole = (...allowedRoles: MarketplaceRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.userRole || 'customer';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Requires ${allowedRoles.join(' or ')} privilege.`,
      });
    }
    return next();
  };
};

export function createRateLimiter(options: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'global';
    const now = Date.now();
    const cutoff = now - options.windowMs;
    const recent = (hits.get(key) || []).filter((ts) => ts > cutoff);

    if (recent.length >= options.max) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before retrying.',
      });
    }

    recent.push(now);
    hits.set(key, recent);
    return next();
  };
};
