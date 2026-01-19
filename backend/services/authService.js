import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { error } from '../utils/logger.js';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hashed) {
  return bcrypt.compare(password, hashed);
}

export function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });
  return token;
}

export function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret';
    return jwt.verify(token, secret);
  } catch (err) {
    error('JWT verify failed', err);
    return null;
  }
}
