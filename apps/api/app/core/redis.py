from redis.asyncio import Redis

from .config import settings

redis: Redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_timeout=2, socket_connect_timeout=2)
