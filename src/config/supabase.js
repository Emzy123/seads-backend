const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Shared Supabase client — imported by both index.js and middleware/auth.js
// so we don't create multiple connections.
// Prefer SUPABASE_SERVICE_ROLE_KEY to bypass RLS in the backend
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(process.env.SUPABASE_URL, key, {
  realtime: {
    transport: WebSocket,
  },
});

module.exports = supabase;
