"""
Pytest configuration and shared fixtures
"""

import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.main import app
from app.services.firebase import FirebaseService
from app.models.auth import TokenData
from app.dependencies.auth import (
    get_current_user,
    get_current_patient,
    get_current_clinician,
    get_patient_or_clinician,
)


# Test user data
TEST_PATIENT_TOKEN = TokenData(user_id="test_patient_123", user_type="patient")
TEST_CLINICIAN_TOKEN = TokenData(user_id="clinician@test.com", user_type="clinician")


async def override_get_current_user():
    """Override for get_current_user dependency - returns test patient by default"""
    return TEST_PATIENT_TOKEN


async def override_get_current_patient():
    """Override for get_current_patient dependency"""
    return TEST_PATIENT_TOKEN


async def override_get_current_clinician():
    """Override for get_current_clinician dependency"""
    return TEST_CLINICIAN_TOKEN


async def override_get_patient_or_clinician():
    """Override for get_patient_or_clinician dependency"""
    return TEST_PATIENT_TOKEN


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def mock_firebase_globally():
    """Automatically mock Firebase service globally for all tests"""
    mock_firebase = MagicMock(spec=FirebaseService)

    # Set up all the common mock returns
    mock_firebase.get_patient_surveys.return_value = [
        {
            "survey_id": "survey_123",
            "survey_type": "BDI",
            "submission_date": "2024-01-01T00:00:00Z",
            "score": 15.0,
            "summary": "Test summary",
            "responses": {"q1": "1", "q2": "2"},
        }
    ]

    mock_firebase.get_all_patients_surveys.return_value = [
        {
            "patient_id": "test_patient_123",
            "surveys": [
                {
                    "survey_type": "BDI",
                    "submission_date": "2024-01-01T00:00:00Z",
                    "survey_id": "survey_123",
                }
            ],
        }
    ]

    mock_firebase.get_survey_trends.return_value = [
        {"submission_date": "2024-01-01T00:00:00Z", "score": 15.0},
        {"submission_date": "2024-01-15T00:00:00Z", "score": 12.0},
    ]

    mock_firebase.save_survey_result.return_value = "survey_123"

    mock_firebase.get_user_profile.return_value = {
        "user_id": "test_patient_123",
        "user_type": "patient",
        "password": "test_password",
        "demographic_info": {"name": "Test Patient", "age": 30},
    }

    mock_firebase.update_user_profile.return_value = True
    mock_firebase.verify_password.return_value = True

    # Mock verify_token to return valid token data for test patient
    async def mock_verify_token(token):
        return {
            "uid": "test_patient_123",
            "user_type": "patient",
            "email": "test@example.com",
        }

    mock_firebase.verify_token = mock_verify_token

    # Patch multiple import paths
    with (
        patch("app.services.firebase.firebase_service", mock_firebase),
        patch("app.api.v1.survey.firebase_service", mock_firebase),
        patch("app.api.v1.dashboard.firebase_service", mock_firebase),
        patch("app.api.v1.user.firebase_service", mock_firebase),
        patch("app.api.v1.auth.firebase_service", mock_firebase),
    ):
        yield mock_firebase


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the FastAPI app with auth dependencies overridden."""
    # Override auth dependencies
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_patient] = override_get_current_patient
    app.dependency_overrides[get_current_clinician] = override_get_current_clinician
    app.dependency_overrides[get_patient_or_clinician] = (
        override_get_patient_or_clinician
    )

    # Create test client
    client = TestClient(app)

    yield client

    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
def client_as_clinician() -> TestClient:
    """Create a test client with clinician user context."""

    async def override_as_clinician():
        return TEST_CLINICIAN_TOKEN

    app.dependency_overrides[get_current_user] = override_as_clinician
    app.dependency_overrides[get_current_patient] = override_as_clinician
    app.dependency_overrides[get_current_clinician] = override_as_clinician
    app.dependency_overrides[get_patient_or_clinician] = override_as_clinician

    client = TestClient(app)

    yield client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_firebase_service():
    """Mock Firebase service for testing."""
    mock_service = Mock(spec=FirebaseService)

    # Mock common methods
    mock_service.verify_token.return_value = {
        "uid": "test_patient_123",
        "user_type": "patient",
    }

    mock_service.get_user_profile.return_value = {
        "user_id": "test_patient_123",
        "user_type": "patient",
        "password": "test_password",
        "demographic_info": {"name": "Test Patient", "age": 30},
    }

    mock_service.save_survey_result.return_value = "survey_123"

    mock_service.get_patient_surveys.return_value = [
        {
            "survey_id": "survey_123",
            "survey_type": "BDI",
            "submission_date": "2024-01-01T00:00:00Z",
            "score": 15.0,
            "summary": "Test summary",
            "responses": {"q1": "1", "q2": "2"},
        }
    ]

    mock_service.get_all_patients_surveys.return_value = [
        {
            "patient_id": "test_patient_123",
            "surveys": [
                {
                    "survey_type": "BDI",
                    "submission_date": "2024-01-01T00:00:00Z",
                    "survey_id": "survey_123",
                }
            ],
        }
    ]

    mock_service.get_survey_trends.return_value = [
        {"submission_date": "2024-01-01T00:00:00Z", "score": 15.0},
        {"submission_date": "2024-01-15T00:00:00Z", "score": 12.0},
    ]

    return mock_service


@pytest.fixture
def mock_patient_token():
    """Mock patient token data."""
    return TokenData(user_id="test_patient_123", user_type="patient")


@pytest.fixture
def mock_clinician_token():
    """Mock clinician token data."""
    return TokenData(user_id="clinician@test.com", user_type="clinician")


@pytest.fixture
def sample_survey_responses():
    """Sample survey responses for testing."""
    return {
        "AUDIT": {
            "q1": "2",
            "q2": "2",
            "q3": "1",
            "q4": "1",
            "q5": "0",
            "q6": "0",
            "q7": "0",
            "q8": "0",
            "q9": "0",
            "q10": "0",
        },
        "BDI": {
            f"q{i}": "1"
            for i in range(1, 22)  # 21 questions, score 1 each
        },
        "BAI": {
            f"q{i}": "1"
            for i in range(1, 22)  # 21 questions, score 1 each
        },
        "PSQI": {
            "sleep_quality": "1",
            "sleep_latency": "1",
            "sleep_duration": "1",
            "sleep_efficiency": "1",
            "sleep_disturbances": "1",
            "sleep_medication": "1",
            "daytime_dysfunction": "1",
        },
        "K-MDQ": {
            f"q{i}": "yes"
            for i in range(1, 8)  # 7 yes answers
        },
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "patient": {
            "user_id": "test_patient_123",
            "user_type": "patient",
            "password": "test_password",
            "demographic_info": {
                "name": "Test Patient",
                "age": 30,
                "gender": "M",
                "date_of_birth": "1994-01-01",
            },
            "psychiatric_history": {
                "previous_diagnoses": "None",
                "current_medications": "None",
            },
        },
        "clinician": {
            "user_id": "clinician@test.com",
            "user_type": "clinician",
            "email": "clinician@test.com",
            "password": "clinician_password",
        },
    }


@pytest.fixture
def auth_headers():
    """Sample authentication headers."""
    return {
        "patient": {"Authorization": "Bearer patient_test_token"},
        "clinician": {"Authorization": "Bearer clinician_test_token"},
        "invalid": {"Authorization": "Bearer invalid_token"},
    }
