"""
Healthcare Survey Backend - FastAPI Main Application
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.api.v1 import auth, survey, dashboard, user, patient
from app.services.firebase import initialize_firebase

# Initialize Firebase on startup
initialize_firebase()

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Healthcare Survey Application",
    version="1.0.0",
    debug=settings.DEBUG,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(
    auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["authentication"]
)

app.include_router(
    survey.router, prefix=f"{settings.API_V1_STR}/survey", tags=["surveys"]
)

app.include_router(
    dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"]
)

app.include_router(user.router, prefix=f"{settings.API_V1_STR}/user", tags=["user"])

app.include_router(
    patient.router, prefix=f"{settings.API_V1_STR}/patient", tags=["patient"]
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Healthcare Survey Backend API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "healthcare-survey-backend"}


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code},
    )
