"""
Application settings and configuration
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file first, before class definition
load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # FastAPI Configuration
    DEBUG: bool = True  # Enable debug temporarily to check additional condition logic
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Healthcare Survey Backend"

    # Firebase Configuration
    FIREBASE_CREDENTIALS_PATH: str = "secret/psy-opd.json"

    # LLM Configuration - use default value if not found
    GOOGLE_API_KEY: Optional[str] = None

    # Admin Configuration
    ADMIN_SECRET_KEY: Optional[str] = None

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Debug print to check if API key is loaded
if settings.DEBUG:
    # print(f"GOOGLE_API_KEY loaded: {'Yes' if settings.GOOGLE_API_KEY else 'No'}")
    if settings.GOOGLE_API_KEY:
        print(f"GOOGLE_API_KEY length: {len(settings.GOOGLE_API_KEY)}")
        print(f"GOOGLE_API_KEY prefix: {settings.GOOGLE_API_KEY[:10]}...")
    else:
        print("Checking environment variables:")
        print(
            f"  os.environ.get('GOOGLE_API_KEY'): {bool(os.environ.get('GOOGLE_API_KEY'))}"
        )
        if os.environ.get("GOOGLE_API_KEY"):
            print(
                f"  Found in os.environ with length: {len(os.environ.get('GOOGLE_API_KEY'))}"
            )
