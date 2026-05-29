import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-gym-saas-token-key-2026';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'SUPERADMIN' | 'OWNER' | 'STAFF';
  gymId: string | null;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Gets the current session and user from cookies in Next.js Server Components / API Routes.
 */
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyJWT(token);
}

/**
 * Ensures strict role-based access and tenant isolation.
 * Throws or returns null if user is unauthorized or belongs to another gym.
 */
export async function getSessionForGym(gymSlug: string): Promise<JWTPayload | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.role === 'SUPERADMIN') return session;

  if (!session.gymId) return null;

  // Verify that the gymId matches the gymSlug
  const gym = await db.gym.findUnique({
    where: { id: session.gymId },
  });

  if (!gym || gym.slug !== gymSlug) {
    return null;
  }

  return session;
}
