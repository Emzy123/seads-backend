const express = require('express');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../validations/schemas');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (supabase) {
  const router = express.Router();

  // Apply rate limiting to login and register
  router.use('/login', authLimiter);
  router.use('/register', authLimiter);

  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, firebase_uid } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.json({ exists: false });
    }

    // Since Firebase ID tokens are handled by the Flutter app,
    // we no longer issue a custom JWT here.
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  });

  router.post('/register', validate(registerSchema), async (req, res) => {
    const { email, name, role, firebase_uid, phone } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .insert({ 
        email, 
        firebase_uid, 
        name, 
        role,
        phone
      })
      .select('id, name, email, phone, role')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  });

  // Re-use the existing Firebase authenticateToken middleware
  router.get('/me', authenticateToken, async (req, res) => {
    // req.user is populated by authenticateToken
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone, role, blood_type, allergies, conditions, firebase_uid, fcm_token')
      .eq('id', req.user.id)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({ error: userError.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  });

  return router;
};
