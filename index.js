const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  realtime: {
    transport: WebSocket
  }
});

const authRoutes = require('./src/routes/auth')(supabase);
const userRoutes = require('./src/routes/users')(supabase);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'SEADS backend is running' });
});

// Nearest ambulance query
app.post('/api/dispatch', async (req, res) => {
  const { lat, lng, patient_id, emergency_type, description } = req.body;

  // Find nearest available ambulance using PostGIS
  const { data: ambulance, error } = await supabase
    .rpc('find_nearest_ambulance', { p_lat: lat, p_lng: lng });

  if (error || !ambulance || ambulance.length === 0) {
    return res.status(404).json({ error: 'No available ambulance found' });
  }

  const nearest = ambulance[0];

  // Create incident
  const { data: incident, error: incError } = await supabase
    .from('incidents')
    .insert({
      patient_id,
      ambulance_id: nearest.id,
      emergency_type,
      description,
      status: 'dispatched',
      patient_location: `SRID=4326;POINT(${lng} ${lat})`
    })
    .select()
    .single();

  if (incError) return res.status(500).json({ error: incError.message });

  // Update ambulance status
  await supabase
    .from('ambulances')
    .update({ status: 'en_route' })
    .eq('id', nearest.id);

  res.json({
    message: 'Ambulance dispatched',
    incident,
    ambulance: nearest,
    distance_meters: nearest.distance_meters
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});