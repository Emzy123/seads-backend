const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Shared Supabase client — imported by both index.js and middleware/auth.js
// so we don't create multiple connections.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  realtime: {
    transport: WebSocket,
  },
});

module.exports = supabase;
