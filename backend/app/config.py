import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    gemini_api_key: str
    model_name: str = "gemini-2.5-flash"
    api_cors_origin: str = "http://localhost:3000"
    max_tool_iterations: int = 4
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

settings = Settings()
