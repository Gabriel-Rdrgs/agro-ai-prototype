const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('❌ Supabase URL e Key são obrigatórios no .env');
}

// Cliente para interações administrativas e validação de token
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ✅ Cliente Admin para operações administrativas (criar usuários, etc.)
// Requer SUPABASE_SERVICE_ROLE_KEY no .env (não commitar!)
let supabaseAdmin = null;
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} else {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY não encontrado. Operações admin não estarão disponíveis.');
}

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;