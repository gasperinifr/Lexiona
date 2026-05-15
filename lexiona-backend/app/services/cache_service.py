"""
Serviço de cache Redis para o Lexiona.
Modo no-op gracioso: se o Redis não estiver configurado ou cair,
o sistema funciona normalmente sem cache.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger("lexiona.cache")

# Cliente Redis (inicializado no lifespan do FastAPI)
_redis_client = None
_cache_available = False


async def connect():
    """Tenta conectar ao Redis. Silencioso se não configurado."""
    global _redis_client, _cache_available
    from app.config import settings
    if not settings.redis_url:
        logger.warning("REDIS_URL não configurada — cache desabilitado.")
        return
    try:
        import redis.asyncio as redis
        _redis_client = await redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=3,
        )
        await _redis_client.ping()
        _cache_available = True
        logger.info("✅ Redis conectado com sucesso.")
    except Exception as e:
        logger.warning(f"⚠️  Redis indisponível ({e}) — continuando sem cache.")
        _redis_client = None
        _cache_available = False


async def disconnect():
    global _redis_client, _cache_available
    if _redis_client:
        await _redis_client.aclose()
        _cache_available = False


async def get(key: str) -> Optional[Any]:
    """Retorna valor do cache ou None se não encontrado / indisponível."""
    if not _cache_available or not _redis_client:
        return None
    try:
        value = await _redis_client.get(key)
        if value is None:
            return None
        return json.loads(value)
    except Exception as e:
        logger.debug(f"Cache get falhou para '{key}': {e}")
        return None


async def set(key: str, value: Any, ttl: int = 300) -> bool:
    """Salva valor no cache. Retorna True se sucesso."""
    if not _cache_available or not _redis_client:
        return False
    try:
        await _redis_client.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as e:
        logger.debug(f"Cache set falhou para '{key}': {e}")
        return False


async def delete(key: str) -> bool:
    """Remove chave do cache."""
    if not _cache_available or not _redis_client:
        return False
    try:
        await _redis_client.delete(key)
        return True
    except Exception as e:
        logger.debug(f"Cache delete falhou para '{key}': {e}")
        return False


async def invalidar_professor(professor_id: str) -> None:
    """Remove todas as chaves de cache de um professor."""
    if not _cache_available or not _redis_client:
        return
    try:
        pattern = f"lexiona:{professor_id}:*"
        keys = await _redis_client.keys(pattern)
        if keys:
            await _redis_client.delete(*keys)
            logger.debug(f"Cache invalidado: {len(keys)} chaves de {professor_id}")
    except Exception as e:
        logger.debug(f"Cache invalidar_professor falhou: {e}")


async def invalidar_disciplina(professor_id: str, disciplina_id: str) -> None:
    """Remove chaves de cache de uma disciplina específica."""
    if not _cache_available or not _redis_client:
        return
    try:
        keys_to_delete = [
            f"lexiona:{professor_id}:aulas:{disciplina_id}",
            f"lexiona:{professor_id}:progresso:{disciplina_id}",
            f"lexiona:{professor_id}:disciplinas",
            f"lexiona:{professor_id}:alertas",
        ]
        # Também remove cache de agenda dos próximos 30 dias
        from datetime import date, timedelta
        for i in range(30):
            d = date.today() + timedelta(days=i)
            keys_to_delete.append(f"lexiona:{professor_id}:agenda:{d}")

        await _redis_client.delete(*keys_to_delete)
    except Exception as e:
        logger.debug(f"Cache invalidar_disciplina falhou: {e}")


def is_available() -> bool:
    return _cache_available
