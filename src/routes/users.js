const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { roleUpdateSchema, profileUpdateSchema, fcmTokenSchema, contactSchema } = require('../validations/schemas');

module.exports = function (supabase) {
  const router = express.Router();

  // GET /api/users/:userId — fetch a user profile by Firebase UID.
  // Called by the Flutter router guard on every navigation event.
  // NOTE: authenticateToken is NOT applied here so the router guard can
  // call this using the Firebase ID token.
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
  router.post('/role', validate(roleUpdateSchema), async (req, res) => {
    const { user_id, phone_number, role, name } = req.body;

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

  // All routes below this line require a valid Firebase ID token
  router.use(authenticateToken);

  router.put('/profile', validate(profileUpdateSchema), async (req, res) => {
    const updates = req.body; // already sanitized by validate

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

  router.post('/fcm-token', validate(fcmTokenSchema), async (req, res) => {
    const { fcm_token } = req.body;

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

  router.post('/contacts', validate(contactSchema), async (req, res) => {
    const { name, phone, relation } = req.body;

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
