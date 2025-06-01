"""
Tests for authentication endpoints
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient


class TestAuthEndpoints:
    """Test class for authentication endpoints"""

    def test_login_success(self, client: TestClient, mock_firebase_service):
        """Test successful login"""
        # Arrange
        login_data = {
            "user_id": "test_patient_123",
            "password": "test_password",
            "user_type": "patient",
        }

        mock_firebase_service.verify_password.return_value = True
        mock_firebase_service.get_user_profile.return_value = {
            "user_id": "test_patient_123",
            "user_type": "patient",
            "password": "test_password",
        }

        # Act
        response = client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user_id"] == "test_patient_123"
        assert data["user_type"] == "patient"

    def test_login_invalid_credentials(self, client: TestClient, mock_firebase_service):
        """Test login with invalid credentials"""
        # Arrange
        login_data = {
            "user_id": "test_patient_123",
            "password": "wrong_password",
            "user_type": "patient",
        }

        mock_firebase_service.verify_password.return_value = False

        # Act
        response = client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_user_type_mismatch(self, client: TestClient, mock_firebase_service):
        """Test login with wrong user type"""
        # Arrange
        login_data = {
            "user_id": "test_patient_123",
            "password": "test_password",
            "user_type": "clinician",  # Wrong type
        }

        mock_firebase_service.verify_password.return_value = True
        mock_firebase_service.get_user_profile.return_value = {
            "user_id": "test_patient_123",
            "user_type": "patient",  # Actual type
            "password": "test_password",
        }

        # Act
        response = client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == 401
        assert "Invalid user type" in response.json()["detail"]

    def test_update_password_success(self, client: TestClient, mock_firebase_service):
        """Test successful password update"""
        # Arrange
        update_data = {
            "user_id": "test_patient_123",
            "current_password": "old_password",
            "new_password": "new_password",
        }

        mock_firebase_service.verify_password.return_value = True
        mock_firebase_service.update_password.return_value = True
        mock_firebase_service.update_user_profile.return_value = True

        # Act
        response = client.post("/api/v1/auth/patient/update-password", json=update_data)

        # Assert
        assert response.status_code == 200
        assert response.json()["message"] == "Password updated successfully"

    def test_update_password_invalid_current(
        self, client: TestClient, mock_firebase_service
    ):
        """Test password update with invalid current password"""
        # Arrange
        update_data = {
            "user_id": "test_patient_123",
            "current_password": "wrong_password",
            "new_password": "new_password",
        }

        mock_firebase_service.verify_password.return_value = False

        # Act
        response = client.post("/api/v1/auth/patient/update-password", json=update_data)

        # Assert
        assert response.status_code == 401
        assert "Invalid current password" in response.json()["detail"]

    def test_register_clinician_success(
        self, client: TestClient, mock_firebase_service
    ):
        """Test successful clinician registration"""
        # Arrange
        register_data = {
            "admin_token": "valid_admin_token",
            "clinician_email": "new_clinician@test.com",
            "password": "clinician_password",
        }

        mock_firebase_service.get_user_profile.return_value = None  # User doesn't exist
        mock_firebase_service.create_user.return_value = "new_clinician@test.com"
        mock_firebase_service.create_user_profile.return_value = True

        with patch("app.dependencies.auth.verify_admin_token") as mock_verify_admin:
            mock_verify_admin.return_value = True

            # Act
            response = client.post(
                "/api/v1/auth/clinician/register", json=register_data
            )

            # Assert
            assert response.status_code == 201
            data = response.json()
            assert data["message"] == "Clinician registered successfully"
            assert data["clinician_id"] == "new_clinician@test.com"

    def test_register_clinician_already_exists(
        self, client: TestClient, mock_firebase_service
    ):
        """Test clinician registration when email already exists"""
        # Arrange
        register_data = {
            "admin_token": "valid_admin_token",
            "clinician_email": "existing@test.com",
            "password": "password",
        }

        mock_firebase_service.get_user_profile.return_value = {
            "user_id": "existing@test.com"
        }

        with patch("app.dependencies.auth.verify_admin_token") as mock_verify_admin:
            mock_verify_admin.return_value = True

            # Act
            response = client.post(
                "/api/v1/auth/clinician/register", json=register_data
            )

            # Assert
            assert response.status_code == 409
            assert "already exists" in response.json()["detail"]

    def test_register_clinician_invalid_admin_token(self, client: TestClient):
        """Test clinician registration with invalid admin token"""
        # Arrange
        register_data = {
            "admin_token": "invalid_token",
            "clinician_email": "test@test.com",
            "password": "password",
        }

        with patch("app.dependencies.auth.verify_admin_token") as mock_verify_admin:
            mock_verify_admin.side_effect = Exception("Invalid admin token")

            # Act
            response = client.post(
                "/api/v1/auth/clinician/register", json=register_data
            )

            # Assert
            assert response.status_code == 500

    def test_register_patient_success(self, client: TestClient, mock_firebase_service):
        """Test successful patient registration"""
        # Arrange
        mock_firebase_service.get_user_profile.return_value = None
        mock_firebase_service.create_user_profile.return_value = True

        with patch("app.dependencies.auth.verify_admin_token") as mock_verify_admin:
            mock_verify_admin.return_value = True

            # Act
            response = client.post(
                "/api/v1/auth/patient/register",
                params={
                    "user_id": "new_patient_123",
                    "password": "patient_password",
                    "admin_token": "valid_admin_token",
                },
            )

            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Patient registered successfully"
            assert data["patient_id"] == "new_patient_123"

    def test_missing_required_fields(self, client: TestClient):
        """Test API calls with missing required fields"""
        # Test login with missing fields
        response = client.post("/api/v1/auth/login", json={"user_id": "test"})
        assert response.status_code == 422

        # Test password update with missing fields
        response = client.post(
            "/api/v1/auth/patient/update-password", json={"user_id": "test"}
        )
        assert response.status_code == 422

        # Test clinician registration with missing fields
        response = client.post(
            "/api/v1/auth/clinician/register", json={"admin_token": "test"}
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestAuthDependencies:
    """Test authentication dependency functions"""

    def test_token_data_creation(self):
        """Test TokenData model creation"""
        from app.models.auth import TokenData

        token_data = TokenData(user_id="test_123", user_type="patient")
        assert token_data.user_id == "test_123"
        assert token_data.user_type == "patient"

    def test_login_request_validation(self):
        """Test LoginRequest validation"""
        from app.models.auth import LoginRequest

        # Valid request
        request = LoginRequest(
            user_id="test_123", password="password", user_type="patient"
        )
        assert request.user_type in ["patient", "clinician"]

        # Test with invalid user_type
        with pytest.raises(ValueError):
            LoginRequest(
                user_id="test_123", password="password", user_type="invalid_type"
            )
