const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Shared config modules — must be imported before routes/middleware
const supabase = require('./src/config/supabase');
require('./src/config/firebase'); // initializes Firebase Admin SDK

const { authenticateToken } = require('./src/middleware/auth');
const { validate } = require('./src/middleware/validate');
const { dispatchSchema } = require('./src/validations/schemas');

const app = express();

// TODO: In production, restrict origin to your actual client domains
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Pass the shared supabase client into route factories
const authRoutes = require('./src/routes/auth')(supabase);
const userRoutes = require('./src/routes/users')(supabase);
const ambulanceRoutes = require('./src/routes/ambulances')(supabase);
const incidentRoutes = require('./src/routes/incidents')(supabase);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/incidents', incidentRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'SEADS backend is running' });
});

// Nearest ambulance dispatch — requires authenticated Firebase user
app.post('/api/dispatch', authenticateToken, validate(dispatchSchema), async (req, res) => {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SEADS backend running on port ${PORT}`);
});