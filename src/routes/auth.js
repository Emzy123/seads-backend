const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function (supabase) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { phone, firebase_uid } = req.body;

    if (!phone || !firebase_uid) {
      return res.status(400).json({ error: 'phone and firebase_uid are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.json({ exists: false });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  });

  router.post('/register', async (req, res) => {
    const { phone, firebase_uid, name, role } = req.body;

    if (!phone || !firebase_uid || !name || !role) {
      return res.status(400).json({ error: 'phone, firebase_uid, name, and role are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({ phone, firebase_uid, name, role })
      .select('id, name, phone, role')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  });

  router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, phone, role, blood_type, allergies, conditions, firebase_uid, fcm_token')
        .eq('id', decoded.id)
        .maybeSingle();

      if (userError) {
        return res.status(500).json({ error: userError.message });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    });
  });

  return router;
};
