const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (supabase) {
  const router = express.Router();

  // GET /api/users/:userId — fetch a user profile by Firebase UID.
  // Called by the Flutter router guard on every navigation event.
  // NOTE: authenticateToken is NOT applied here so the router guard can
  // call this using the Firebase ID token (see dual-token audit note).
  // TODO: Replace token verification with firebase-admin once wired up.
  router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, firebase_uid')
      .eq('firebase_uid', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(data);
  });

  // POST /api/users/role — save or update role for a newly registered user.
  // Called by RoleSelectionScreen after a user picks their role.
  router.post('/role', async (req, res) => {
    const { user_id, phone_number, role, name } = req.body;

    if (!user_id || !role) {
      return res.status(400).json({ error: 'user_id and role are required' });
    }

    const validRoles = ['patient', 'paramedic', 'dispatcher'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
    }

    // Upsert: create user if not exists, otherwise update role
    const { data, error } = await supabase
      .from('users')
      .upsert(
        { firebase_uid: user_id, phone: phone_number, role, name: name || '' },
        { onConflict: 'firebase_uid' }
      )
      .select('id, name, phone, role')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ user: data });
  });

  // All routes below this line require a valid JWT token
  router.use(authenticateToken);

  router.put('/profile', async (req, res) => {
    const { name, blood_type, allergies, conditions } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (blood_type !== undefined) updates.blood_type = blood_type;
    if (allergies !== undefined) updates.allergies = allergies;
    if (conditions !== undefined) updates.conditions = conditions;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No profile fields provided' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ user: data });
  });

  router.post('/fcm-token', async (req, res) => {
    const { fcm_token } = req.body;

    if (!fcm_token) {
      return res.status(400).json({ error: 'fcm_token is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ fcm_token })
      .eq('id', req.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ user: data });
  });

  router.get('/contacts', async (req, res) => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id, name, phone, relation')
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ contacts: data || [] });
  });

  router.post('/contacts', async (req, res) => {
    const { name, phone, relation } = req.body;

    if (!name || !phone || !relation) {
      return res.status(400).json({ error: 'name, phone, and relation are required' });
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({ user_id: req.user.id, name, phone, relation })
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ contact: data });
  });

  router.delete('/contacts/:id', async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.json({ message: 'Contact deleted' });
  });

  return router;
};
