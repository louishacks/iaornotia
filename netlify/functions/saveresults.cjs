const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Initialiser le client Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // ... reste du code inchangé ...
}; 