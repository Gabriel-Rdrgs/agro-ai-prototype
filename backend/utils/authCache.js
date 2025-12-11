// backend/utils/authCache.js
/**
 * Cache agressivo para operações de autenticação
 * Reduz carga no Supabase para queries frequentes
 */

const globalCache = require('./cache');

const USER_CACHE_TTL = 300; // 5 minutos
const USER_CACHE_PREFIX = 'user:';

/**
 * Busca usuário com cache
 */
async function getCachedUser(email, prisma) {
  const cacheKey = `${USER_CACHE_PREFIX}${email}`;
  
  // Tenta cache primeiro
  const cached = globalCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Se não estiver em cache, busca no banco
  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true // Necessário para login
      }
    });
    
    // Cache apenas se encontrou usuário
    if (user) {
      globalCache.set(cacheKey, user, USER_CACHE_TTL);
    }
    
    return user;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error.message);
    throw error;
  }
}

/**
 * Invalida cache de usuário (após update/delete)
 */
function invalidateUserCache(email) {
  const cacheKey = `${USER_CACHE_PREFIX}${email}`;
  globalCache.delete(cacheKey);
}

/**
 * Invalida cache de todos os usuários (após mudanças globais)
 */
function invalidateAllUserCache() {
  // Limpa cache que começa com 'user:'
  globalCache.invalidatePattern('user:*');
}

module.exports = {
  getCachedUser,
  invalidateUserCache,
  invalidateAllUserCache
};
