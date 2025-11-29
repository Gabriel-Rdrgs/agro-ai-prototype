# utils/cache.py
"""
Gerenciador de cache em memória.
"""

from datetime import datetime, timedelta
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Cache em memória com TTL (Time To Live).
    
    Exemplo:
        cache = CacheManager(ttl_seconds=1800)
        cache.set('key', {'data': 123})
        value = cache.get('key')  # Retorna {'data': 123}
    """
    
    def __init__(self, ttl_seconds: int = 3600):
        """
        Args:
            ttl_seconds: Tempo de vida do cache em segundos (padrão: 1h)
        """
        self.cache = {}
        self.ttl = timedelta(seconds=ttl_seconds)
        logger.info(f"✅ CacheManager iniciado (TTL: {ttl_seconds}s)")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Busca valor do cache.
        
        Args:
            key: Chave de busca
        
        Returns:
            Valor armazenado ou None se expirado/inexistente
        """
        if key not in self.cache:
            logger.debug(f"🔍 Cache MISS: {key}")
            return None
        
        value, timestamp = self.cache[key]
        
        # Verifica expiração
        if datetime.now() - timestamp > self.ttl:
            del self.cache[key]
            logger.debug(f"⏰ Cache EXPIRED: {key}")
            return None
        
        logger.debug(f"✅ Cache HIT: {key}")
        return value
    
    def set(self, key: str, value: Any) -> None:
        """
        Armazena valor no cache.
        
        Args:
            key: Chave de armazenamento
            value: Valor a ser armazenado (qualquer tipo)
        """
        self.cache[key] = (value, datetime.now())
        logger.debug(f"💾 Cache SET: {key}")
    
    def delete(self, key: str) -> bool:
        """
        Remove valor do cache.
        
        Args:
            key: Chave a remover
        
        Returns:
            True se removido, False se não existia
        """
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"🗑️ Cache DELETE: {key}")
            return True
        return False
    
    def clear(self) -> None:
        """Limpa todo o cache"""
        count = len(self.cache)
        self.cache.clear()
        logger.info(f"🧹 Cache limpo ({count} itens removidos)")
    
    def size(self) -> int:
        """Retorna número de itens no cache"""
        return len(self.cache)
    
    def cleanup_expired(self) -> int:
        """
        Remove itens expirados do cache.
        
        Returns:
            Número de itens removidos
        """
        now = datetime.now()
        expired_keys = [
            k for k, (_, ts) in self.cache.items()
            if now - ts > self.ttl
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info(f"🧹 {len(expired_keys)} itens expirados removidos")
        
        return len(expired_keys)


# Instância global (singleton)
global_cache = CacheManager(ttl_seconds=1800)  # 30 minutos padrão
