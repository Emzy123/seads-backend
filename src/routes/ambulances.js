const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { locationSchema } = require('../validations/schemas');

module.exports = function (supabase) {
  const router = express.Router();

  // All ambulance routes require a valid Firebase ID token
  router.use(authenticateToken);

  // PUT /api/ambulances/location
  // Paramedics call this repeatedly to update their live location.
  router.put('/location', validate(locationSchema), async (req, res) => {
    // Only paramedics should be able to update their location
    if (req.user.role !== 'paramedic') {
      return res.status(403).json({ error: 'Only paramedics can update ambulance locations' });
    }

    const { lat, lng } = req.body;

    // Update the ambulance row where the paramedic is assigned
    // We assume the ambulances table has a `paramedic_id` column linking to the users table
    const { data, error } = await supabase
      .from('ambulances')
      .update({ 
        current_location: `SRID=4326;POINT(${lng} ${lat})`,
        updated_at: new Date().toISOString()
      })
      .eq('paramedic_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'No ambulance assigned to this paramedic' });
    }

    return res.json({ ambulance: data });
  });

  // GET /api/ambulances
  // Dispatchers call this to see all ambulances and their locations.
  router.get('/', async (req, res) => {
    if (req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Only dispatchers can view all ambulances' });
    }

    // You can also add queries like ?status=available to filter
    let query = supabase.from('ambulances').select('*, users!ambulances_paramedic_id_fkey(name, phone)');
    
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ambulances: data || [] });
  });

  return router;
};
