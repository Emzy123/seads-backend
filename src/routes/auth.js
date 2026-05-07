const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function (supabase) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { email, firebase_uid } = req.body;

    if (!email || !firebase_uid) {
      return res.status(400).json({ error: 'email and firebase_uid are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.json({ exists: false });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  });

  router.post('/register', async (req, res) => {
    const { email, password, name, role, firebase_uid, phone } = req.body;

    if (!email || !firebase_uid || !name || !role || !phone) {
      return res.status(400).json({ error: 'email, firebase_uid, name, phone, and role are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({ 
        email: email.trim().toLowerCase(), 
        firebase_uid, 
        name: name.trim(), 
        role,
        phone: phone.trim()
      })
      .select('id, name, email, phone, role')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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
        .select('id, name, email, phone, role, blood_type, allergies, conditions, firebase_uid, fcm_token')
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
