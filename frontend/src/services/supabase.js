import { createClient } from '@supabase/supabase-js';

// No React, variáveis de ambiente devem começar com REACT_APP_
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Supabase URL ou Key não encontradas no .env do Frontend!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);