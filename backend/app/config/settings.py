"""
Application settings and configuration
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # FastAPI Configuration
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Healthcare Survey Backend"

    # Firebase Configuration
    FIREBASE_CREDENTIALS_PATH: str = "secret/psy-opd-firebase-adminsdk-fbsvc-d8e30124f5.json"

    # LLM Configuration
    GOOGLE_API_KEY: str = os.environ.get("GOOGLE_API_KEY")

    # Admin Configuration
    ADMIN_SECRET_KEY: Optional[str] = None

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


load_dotenv()

# Create settings instance
settings = Settings()
