const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (supabase) {
  const router = express.Router();

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
