// backend/createUser.js
// Script para criar usuário comum (analyst) no Supabase Auth
// Uso: node createUser.js [email] [password] [name] [role]

require('dotenv').config();
const { supabaseAdmin } = require('./utils/supabase');

async function main() {
  // Lê argumentos da linha de comando ou usa valores padrão
  const email = process.argv[2] || 'usuario@teste.com';
  const password = process.argv[3] || '123456';
  const name = process.argv[4] || 'Usuário Teste';
  const role = process.argv[5] || 'analyst'; // analyst ou user (não admin)

  console.log(`\n🔐 Criando usuário ${role}: ${email}...`);

  // Validação
  if (!email || !password) {
    console.error('❌ Erro: Email e senha são obrigatórios.');
    console.log('\nUso: node createUser.js [email] [password] [name] [role]');
    console.log('Exemplo: node createUser.js usuario@teste.com 123456 "João Silva" analyst');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Erro: Senha deve ter no mínimo 6 caracteres.');
    process.exit(1);
  }

  if (!supabaseAdmin) {
    console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurado no .env');
    process.exit(1);
  }

  try {
    // Cria usuário no Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirma email automaticamente
      user_metadata: {
        name: name,
        role: role // analyst ou user (não admin)
      }
    });

    if (error) {
      console.error('❌ Erro ao criar usuário:', error.message);
      
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.error('   → Usuário já existe. Use outro email ou atualize o existente.');
      }
      
      process.exit(1);
    }

    if (!data.user) {
      console.error('❌ Erro: Usuário criado mas dados não retornados.');
      process.exit(1);
    }

    console.log('\n✅ Usuário criado com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email:     ${data.user.email}`);
    console.log(`👤 Nome:      ${data.user.user_metadata?.name || name}`);
    console.log(`🔑 Role:      ${data.user.user_metadata?.role || role}`);
    console.log(`🆔 ID:        ${data.user.id}`);
    console.log(`📅 Criado em: ${new Date(data.user.created_at).toLocaleString('pt-BR')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Você pode usar este usuário para testar:');
    console.log(`   - Login no frontend: ${email}`);
    console.log(`   - Senha: ${password}`);
    console.log(`   - Role: ${role} (não tem acesso a rotas admin)`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    process.exit(1);
  }
}

main();

