from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    gemini_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./bharatai.db"
    jwt_secret: str = "change-me-in-production"
    auth_required: bool = False
    jwt_expire_minutes: int = 60
    refresh_expire_days: int = 30
    api_cors_origin: str = "http://localhost:3000"
    model_provider: str = "gemini"
    model_name: str = "gemini-2.5-flash"
    fallback_models: str = ""
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 768
    openai_api_key: str = ""
    openai_base_url: str = ""
    qwen_api_key: str = ""
    qwen_base_url: str = ""
    redis_url: str = ""
    rate_limit_per_minute: int = 30
    max_tool_iterations: int = 6
    max_message_chars: int = 100000
    context_window_chars: int = 60000
    summary_max_chars: int = 6000
    admin_emails: str = ""
    log_level: str = "INFO"
    environment: str = "development"
    trusted_hosts: str = "localhost,127.0.0.1"
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")
settings = Settings()
