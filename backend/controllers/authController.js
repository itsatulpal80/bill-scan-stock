import { connectDb, getDb } from '../models/db.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../services/authService.js';
import { info, error } from '../utils/logger.js';

export async function signup(req, res) {
  try {
    const { mobile, password, name } = req.body || {};
    if (!mobile || !password) return res.status(400).json({ success: false, error: 'mobile and password required' });

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) return res.status(500).json({ success: false, error: 'MONGODB_URI not configured' });
    await connectDb(MONGODB_URI);
    const db = getDb();
    const users = db.collection('users');

    const exists = await users.findOne({ mobile });
    if (exists) return res.status(409).json({ success: false, error: 'User already exists' });

    const pwHash = await hashPassword(password);
    const userDoc = { mobile, password: pwHash, name: name || null, role: 'staff', created_at: new Date() };
    const r = await users.insertOne(userDoc);
    const user = { id: r.insertedId.toString(), mobile, name: userDoc.name, role: userDoc.role };
    const token = signToken({ sub: user.id, mobile: user.mobile, role: user.role });
    info('User signup', mobile);
    return res.json({ success: true, user, token });
  } catch (err) {
    error('Signup error', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
}

export async function login(req, res) {
  try {
    const { mobile, password } = req.body || {};
    if (!mobile || !password) return res.status(400).json({ success: false, error: 'mobile and password required' });

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) return res.status(500).json({ success: false, error: 'MONGODB_URI not configured' });
    await connectDb(MONGODB_URI);
    const db = getDb();
    const users = db.collection('users');

    const userDoc = await users.findOne({ mobile });
    if (!userDoc) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const ok = await verifyPassword(password, userDoc.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const user = { id: userDoc._id.toString(), mobile: userDoc.mobile, name: userDoc.name || null, role: userDoc.role || 'staff' };
    const token = signToken({ sub: user.id, mobile: user.mobile, role: user.role });
    info('User login', mobile);
    return res.json({ success: true, user, token });
  } catch (err) {
    error('Login error', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
}

export async function me(req, res) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Missing token' });
    const token = auth.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ success: false, error: 'Invalid token' });

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) return res.status(500).json({ success: false, error: 'MONGODB_URI not configured' });
    await connectDb(MONGODB_URI);
    const db = getDb();
    const users = db.collection('users');

    const userDoc = await users.findOne({ _id: new (require('mongodb').ObjectId)(payload.sub) });
    if (!userDoc) return res.status(404).json({ success: false, error: 'User not found' });

    const user = { id: userDoc._id.toString(), mobile: userDoc.mobile, name: userDoc.name || null, role: userDoc.role || 'staff' };
    return res.json({ success: true, user });
  } catch (err) {
    error('Me error', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed' });
  }
}
