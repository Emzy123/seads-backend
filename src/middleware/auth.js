const admin = require('../config/firebase');
const supabase = require('../config/supabase');

/**
 * authenticateToken
 *
 * Verifies the Firebase ID token sent by the Flutter app in the
 * Authorization: Bearer <firebase_id_token> header.
 *
 * On success it attaches req.user = { id, phone, role, firebase_uid }
 * where `id` is the internal Supabase row id used by all route handlers.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    // 1. Verify the Firebase ID token — throws if expired / invalid
    const decoded = await admin.auth().verifyIdToken(token);

    // 2. Look up the corresponding Supabase user row by firebase_uid
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, phone, role, firebase_uid')
      .eq('firebase_uid', decoded.uid)
      .maybeSingle();

    if (error) {
      console.error('Auth middleware — Supabase lookup error:', error.message);
      return res.status(500).json({ error: 'Failed to look up user account' });
    }

    if (!user) {
      // Firebase auth succeeded but the user hasn't registered yet
      return res.status(401).json({ error: 'User account not found. Please complete registration.' });
    }

    // 3. Attach user to request in the same shape that route handlers expect
    req.user = {
      id: user.id,
      phone: user.phone,
      role: user.role,
      firebase_uid: decoded.uid,
    };

    next();
  } catch (err) {
    // Firebase auth errors all start with "auth/"
    if (err.code && err.code.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }
    console.error('Auth middleware — unexpected error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = { authenticateToken };
