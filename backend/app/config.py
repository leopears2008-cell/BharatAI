from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    gemini_api_key:str="";database_url:str="sqlite+aiosqlite:///./bharatai.db";jwt_secret:str="change-me-in-production";auth_required:bool=False;api_cors_origin:str="http://localhost:3000";model_provider:str="gemini";model_name:str="gemini-2.5-flash";embedding_model:str="gemini-embedding-001";openai_api_key:str="";openai_base_url:str="";max_tool_iterations:int=4;max_message_chars:int=100000;rate_limit_per_minute:int=30
    model_config=SettingsConfigDict(env_file=".env",case_sensitive=False,extra="ignore")
settings=Settings()
