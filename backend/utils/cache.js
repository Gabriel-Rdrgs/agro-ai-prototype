// backend/utils/cache.js
/**
 * Cache em memória para Node.js (similar ao Python)
 * URGENTE: Performance crítica para aplicação web
 */

class CacheManager {
  constructor(ttlSeconds = 300) {
    // TTL padrão: 5 minutos (dados dinâmicos)
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000; // Converte para ms
    console.log(`✅ CacheManager iniciado (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Busca valor do cache
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null; // Cache miss
    }

    const { value, timestamp } = item;
    const now = Date.now();

    // Verifica expiração
    if (now - timestamp > this.ttl) {
      this.cache.delete(key);
      return null; // Cache expired
    }

    return value; // Cache hit
  }

  /**
   * Armazena valor no cache
   */
  set(key, value, customTtl = null) {
    const ttl = customTtl ? customTtl * 1000 : this.ttl;
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Remove valor do cache
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache limpo (${size} itens removidos)`);
    return size;
  }

  /**
   * Remove itens expirados
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      const ttl = item.ttl || this.ttl;
      if (now - item.timestamp > ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} itens expirados removidos do cache`);
    }

    return cleaned;
  }

  /**
   * Retorna tamanho do cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Invalida cache por padrão (ex: 'opportunities:*')
   */
  invalidatePattern(pattern) {
    let invalidated = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }
}

// Instância global (singleton)
const globalCache = new CacheManager(300); // 5 minutos padrão

// Limpeza automática a cada 1 minuto
setInterval(() => {
  globalCache.cleanup();
}, 60000);

module.exports = globalCache;



