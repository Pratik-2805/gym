import { verifyJWT } from '../utils/auth.js';
import prisma from '../prisma.js';

/**
 * Middleware to authenticate requests via JWT cookie or header.
 */
export async function authenticateToken(req, res, next) {
  let token = req.cookies?.auth_token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }

  req.user = payload;
  next();
}

/**
 * Middleware to enforce strict gym-level tenant scoping.
 */
export async function scopeToGym(req, res, next) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User session missing' });
  }

  if (user.role === 'SUPERADMIN') {
    return next();
  }

  if (!user.gymId) {
    return res.status(403).json({ error: 'Forbidden: User not associated with a gym' });
  }

  // Fetch the gym using the user's gymId
  const gym = await prisma.gym.findUnique({
    where: { id: user.gymId },
  });

  if (!gym) {
    return res.status(404).json({ error: 'Gym not found' });
  }

  // Attach gym to request
  req.gym = gym;

  next();
}
