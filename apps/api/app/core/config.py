from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: Literal["dev", "test", "prod"] = "dev"

    database_url: str = "postgresql+asyncpg://neyrohelp:neyrohelp@127.0.0.1:5432/neyrohelp"
    redis_url: str = "redis://127.0.0.1:6379/0"

    # Sirlar — production'da majburiy (validate_prod tekshiradi)
    secret_key: SecretStr = SecretStr("dev-secret-change-me-dev-secret-change-me")
    revalidate_secret: SecretStr = SecretStr("dev-revalidate-secret")

    site_url: str = "http://localhost:3000"
    web_internal_url: str = "http://127.0.0.1:3000"  # Next revalidate uchun
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    access_ttl_minutes: int = 15
    refresh_ttl_days: int = 7
    cookie_secure: bool = False  # prod: True
    cookie_domain: str | None = None

    media_dir: str = "./media"
    media_url: str = "/media"
    max_upload_mb: int = 10

    telegram_bot_token: SecretStr | None = None
    telegram_chat_id: str | None = None
    telegram_webhook_secret: SecretStr | None = None
    telegram_api_base: str = "https://api.telegram.org"
    # Ikki bosqichli kirish. Hozircha o‘chiq (faqat login + kuchli parol); kod saqlangan — keyin yoqiladi
    twofa_enabled: bool = False
    # 2FA kodlarini yuboradigan bot (masalan Farm Bot). Bo‘sh bo‘lsa — arizalar boti ishlatiladi
    twofa_bot_token: SecretStr | None = None
    trusted_device_days: int = 30

    lead_retention_days: int = 365
    public_cache_ttl: int = 600  # Redis, soniya

    def validate_prod(self) -> None:
        if self.env != "prod":
            return
        weak = [
            name
            for name, val in (("SECRET_KEY", self.secret_key), ("REVALIDATE_SECRET", self.revalidate_secret))
            if len(val.get_secret_value()) < 32 or "dev" in val.get_secret_value()
        ]
        if weak:
            raise RuntimeError(f"Production uchun kuchli sirlar kerak: {', '.join(weak)}")
        if not self.cookie_secure:
            raise RuntimeError("Production'da COOKIE_SECURE=true bo‘lishi shart")


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.validate_prod()
    return s


settings = get_settings()
