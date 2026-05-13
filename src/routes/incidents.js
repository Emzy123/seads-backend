const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { incidentStatusSchema } = require('../validations/schemas');

module.exports = function (supabase) {
  const router = express.Router();

  router.use(authenticateToken);

  // PUT /api/incidents/:id/status
  // Paramedics call this to transition incident state (en_route -> on_scene -> completed)
  router.put('/:id/status', validate(incidentStatusSchema), async (req, res) => {
    if (req.user.role !== 'paramedic' && req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Not authorized to update incident status' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const { data: incident, error } = await supabase
      .from('incidents')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // If the incident is completed or cancelled, free up the ambulance
    if (status === 'completed' || status === 'cancelled') {
      if (incident.ambulance_id) {
        await supabase
          .from('ambulances')
          .update({ status: 'available' })
          .eq('id', incident.ambulance_id);
      }
    }

    return res.json({ incident });
  });

  // GET /api/incidents
  // Dispatchers call this to view all incidents
  router.get('/', async (req, res) => {
    if (req.user.role !== 'dispatcher') {
      return res.status(403).json({ error: 'Only dispatchers can view all incidents' });
    }

    let query = supabase.from('incidents').select('*, patient:patient_id(name, phone), ambulance:ambulance_id(*)');
    
    // Optional status filter
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    } else {
      // By default, hide completed/cancelled unless specified
      query = query.not('status', 'in', '("completed","cancelled")');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ incidents: data || [] });
  });

  return router;
};
